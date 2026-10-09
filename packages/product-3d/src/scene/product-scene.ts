import { Logger } from "@workspace/logger";
import gsap from "gsap";
import type GUI from "lil-gui";
import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import type { CameraPose, ChromeFix, ExplodeConfig, Vec3 } from "../types";
import { partitionMeshes, splitPieces } from "./model-fixes";
import { StudioEnvironment } from "./studio-environment";

const logger = new Logger("product-scene");

type Props = {
  /**
   * Element the scene mounts its own canvas into and sizes against. The
   * canvas is created here, not passed in: after `forceContextLoss()` a
   * canvas can never host a WebGL context again, so a canvas reused across
   * Fast Refresh or StrictMode remounts would fail to initialise.
   */
  stage: HTMLElement;
  /** Where the camera starts, before any scroll. */
  initialPose: CameraPose;
};

/** Vertical field of view. Narrow enough to read as a product lens, not a GoPro. */
const FIELD_OF_VIEW = 30;
/** Below this width the copy stacks under the model instead of beside it. */
const NARROW_BREAKPOINT = 768;
/** Default narrow-screen lift of the model, as a fraction of height. */
const NARROW_LIFT = 0.16;

/** A world point projected to the stage, in CSS pixels. */
export type ScreenPoint = { x: number; y: number; facing: boolean };

/**
 * Vanilla Three.js scene for one product model.
 *
 * GSAP never touches the camera directly. It tweens `rig` (position, target,
 * framing) and calls `invalidate()`. The render derives the real camera from
 * the rig, which is where the responsive adjustments (distance on portrait
 * screens, framing offset) are applied without corrupting tweened values.
 */
export class ProductScene {
  readonly rig = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    frameOffset: 0,
    /**
     * On narrow screens, how far up the model is lifted, as a fraction of the
     * height, to clear copy or a bottom sheet below it. Tweenable.
     */
    frameLift: NARROW_LIFT,
  };

  private renderListeners = new Set<() => void>();

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private manager: THREE.LoadingManager;
  private pmrem: THREE.PMREMGenerator;
  private environment: StudioEnvironment;
  private environmentTarget: THREE.WebGLRenderTarget;
  private keyLight: THREE.DirectionalLight;
  private resizeObserver: ResizeObserver;
  private stage: HTMLElement;

  private width = 1;
  private height = 1;
  private isNarrow = false;
  private distanceScale = 1;
  private dirty = true;
  /** Nothing is drawn until the model (and so the shadow map) exists. */
  private hasModel = false;
  private modelRoot?: THREE.Object3D;
  /**
   * Exploded view, set by enableExplode. Each assembly sits in a pivot at its
   * own centre, so it can scale and turn in place on hover; the pivot also
   * carries the explode travel.
   */
  private assemblies: {
    id: string;
    pivot: THREE.Group;
    /** Pivot rest position (the assembly's centre, in the parent's space). */
    rest: THREE.Vector3;
    /** Travel to its slot in the exploded row, in the parent's space. */
    offset: THREE.Vector3;
    delay: number;
    /** Assembled world bounds. */
    bounds: THREE.Box3;
  }[] = [];
  /** Camera pose that frames the exploded row, computed by enableExplode. */
  explodedPose?: CameraPose;
  private ground!: THREE.Mesh;
  /** Moving parts invalidate the one-time shadow; refresh until they rest. */
  private shadowsMoving = false;

  private controls?: OrbitControls;
  private gui?: GUI;

  constructor({ stage, initialPose }: Props) {
    this.stage = stage;

    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    stage.append(canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Khronos PBR Neutral: keeps product colours true, which ACES doesn't.
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Only the camera ever moves, so the shadow is computed once after load.
    this.renderer.shadowMap.autoUpdate = false;

    this.scene = new THREE.Scene();

    // Studio reflections without downloading an HDR.
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = new StudioEnvironment();
    this.environmentTarget = this.pmrem.fromScene(this.environment, 0.04);
    this.scene.environment = this.environmentTarget.texture;
    // Tuned to read like Blender's Material Preview on painted CAD exports:
    // a light satin grey that still shows the castings' form.
    this.scene.environmentIntensity = 1.1;

    this.keyLight = new THREE.DirectionalLight(0xffffff, 3);
    this.keyLight.position.set(0.7, 1.6, 1.1);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = -0.5;
    this.keyLight.shadow.camera.right = 0.5;
    this.keyLight.shadow.camera.top = 0.5;
    this.keyLight.shadow.camera.bottom = -0.5;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 4;
    this.keyLight.shadow.radius = 6;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    // Invisible floor that only shows the shadow — the contact shadow that
    // grounds the device on the off-white page.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      // No depth write: parts can travel below floor level when exploded,
      // and a depth-writing floor would hide their transparent decals.
      new THREE.ShadowMaterial({ opacity: 0.16, depthWrite: false })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;

    this.camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 0.01, 20);
    this.applyPose(initialPose);

    this.manager = new THREE.LoadingManager();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(stage);
    this.resize();

    gsap.ticker.add(this.tick);
  }

  /** Load the GLB. Rejects if `dispose()` aborts it first. */
  async load(
    url: string,
    onProgress?: (ratio: number) => void,
    chromeFixes: ChromeFix[] = []
  ) {
    const loader = new GLTFLoader(this.manager);
    loader.setMeshoptDecoder(MeshoptDecoder);

    const gltf = await loader.loadAsync(url, (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    });

    this.scene.add(gltf.scene);
    this.modelRoot = gltf.scene;
    this.applyChromeFixes(gltf.scene, chromeFixes);

    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material as THREE.MeshStandardMaterial;
      // Blender's exporter writes KHR_materials_specular at 2× (Specular IOR
      // Level 1.0), which turns paint into a mirror of the white studio and
      // flattens it. Cap it at the physical default.
      if (
        material instanceof THREE.MeshPhysicalMaterial &&
        material.specularColor.r > 1
      ) {
        material.specularColor.setScalar(1);
      }
      if (material.transparent) {
        // Blended glass has to draw after the opaque body, or it pops in and
        // out as per-object sorting flips at some camera angles.
        object.renderOrder = 1;
      } else {
        object.castShadow = true;
      }
    });

    this.hasModel = true;
    this.renderer.shadowMap.needsUpdate = true;
    this.invalidate();
  }

  private applyChromeFixes(root: THREE.Object3D, fixes: ChromeFix[]) {
    if (fixes.length === 0) return;
    // Polished steel. Reads as chrome because the studio environment gives
    // it clean softbox highlights to reflect.
    const chrome = new THREE.MeshStandardMaterial({
      color: 0xdfe2e6,
      metalness: 1,
      roughness: 0.28,
    });
    for (const fix of fixes) {
      const mesh = root.getObjectByName(fix.mesh);
      if (!(mesh instanceof THREE.Mesh)) continue;
      splitPieces(
        mesh,
        (bounds) => bounds.max.y - bounds.min.y > fix.minHeight,
        chrome
      );
    }
  }

  /**
   * Split the model into the configured assemblies and lay out where each
   * travels: one clean row (or a column on portrait screens), ordered by
   * `config.order`, with each part centred on the row's axis.
   */
  enableExplode(config: ExplodeConfig, layout: "row" | "column" = "row") {
    if (!this.modelRoot || this.assemblies.length) return;
    const passes = (
      test: ExplodeConfig["parts"][number]["any"][number],
      centre: THREE.Vector3,
      meshName: string
    ) =>
      (test.meshIncludes === undefined ||
        meshName.includes(test.meshIncludes)) &&
      (test.xMin === undefined || centre.x >= test.xMin) &&
      (test.xMax === undefined || centre.x <= test.xMax) &&
      (test.yMin === undefined || centre.y >= test.yMin) &&
      (test.yMax === undefined || centre.y <= test.yMax) &&
      (test.zMin === undefined || centre.z >= test.zMin) &&
      (test.zMax === undefined || centre.z <= test.zMax);

    const { groups, bounds } = partitionMeshes(
      this.modelRoot,
      (centre, meshName) => {
        const part = config.parts.find((candidate) =>
          candidate.any.some((test) => passes(test, centre, meshName))
        );
        return part?.id ?? config.fallback;
      }
    );

    // Row slots. The camera looks along -X, so a row runs along Z (screen
    // left is +Z) and a column along Y (top first).
    const ordered = config.order.filter(
      (id) => groups.has(id) && bounds.has(id)
    );
    const axis = layout === "row" ? "z" : "y";
    const extent = (id: string) => {
      const size = (bounds.get(id) as THREE.Box3).getSize(new THREE.Vector3());
      return size[axis];
    };
    const total =
      ordered.reduce((sum, id) => sum + extent(id), 0) +
      config.gap * Math.max(0, ordered.length - 1);
    const rowCentre = new THREE.Vector3(0, 0.3, 0);
    let cursor = total / 2;

    for (const id of ordered) {
      const group = groups.get(id) as THREE.Group;
      const box = bounds.get(id) as THREE.Box3;
      const parent = group.parent ?? group;
      const part = config.parts.find((entry) => entry.id === id);
      const size = extent(id);

      const centreWorld = box.getCenter(new THREE.Vector3());
      const slot = rowCentre.clone();
      slot[axis] = cursor - size / 2;
      cursor -= size + config.gap;

      // Pivot at the assembly's centre, in the parent's space.
      const rest = parent.worldToLocal(centreWorld.clone());
      const pivot = new THREE.Group();
      pivot.name = `pivot:${id}`;
      pivot.position.copy(rest);
      parent.add(pivot);
      group.position.copy(rest).negate();
      pivot.add(group);

      const toLocal = new THREE.Matrix3().setFromMatrix4(
        parent.matrixWorld.clone().invert()
      );
      this.assemblies.push({
        id,
        pivot,
        rest,
        offset: slot.sub(centreWorld).applyMatrix3(toLocal),
        delay: part?.delay ?? 0,
        bounds: box.clone(),
      });
    }

    // Frame the whole row from the branded +X side, slightly above. The
    // target and size come from where the parts actually land when fully
    // exploded (their travel, in world space), not the nominal row centre,
    // so models of any size and origin stay centred and fully in frame.
    const exploded = new THREE.Box3();
    for (const assembly of this.assemblies) {
      const parent = assembly.pivot.parent ?? assembly.pivot;
      const shift = assembly.offset
        .clone()
        .applyMatrix3(new THREE.Matrix3().setFromMatrix4(parent.matrixWorld));
      exploded.union(assembly.bounds.clone().translate(shift));
    }
    const centre = exploded.getCenter(new THREE.Vector3());
    const size = exploded.getSize(new THREE.Vector3());
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const aspect = Math.max(this.camera.aspect, 0.1);
    // Fit both extents: the row's length runs along Z (screen width), a
    // column's along Y (screen height).
    const halfHeight = Math.max(size.y, size.z / aspect) / 2;
    const distance =
      // A little margin; columns leave room for the header and the card.
      ((halfHeight / Math.tan(fov / 2)) * (layout === "column" ? 1.5 : 1.16) +
        // Fit the near faces, not the centre plane: deep parts (the camera
        // looks along X) otherwise loom past the edges.
        size.x / 2) /
      // render() pulls the camera back on portrait screens; undo it here
      // since this distance already fits the screen.
      this.distanceScale;
    const elevation = THREE.MathUtils.degToRad(12);
    const azimuth = THREE.MathUtils.degToRad(84);
    this.explodedPose = {
      camera: [
        centre.x + distance * Math.cos(elevation) * Math.sin(azimuth),
        centre.y + distance * Math.sin(elevation),
        centre.z + distance * Math.cos(elevation) * Math.cos(azimuth),
      ],
      target: [centre.x, centre.y, centre.z],
      frameOffset: 0,
    };

    this.renderer.shadowMap.needsUpdate = true;
    this.invalidate();
  }

  /** 0 = assembled, 1 = fully exploded. Each part eases in after its delay. */
  setExplode(progress: number) {
    let lowest = 0;
    for (const assembly of this.assemblies) {
      const local = THREE.MathUtils.clamp(
        (progress - assembly.delay) / (1 - assembly.delay),
        0,
        1
      );
      // Smoothstep: parts ease off and settle rather than sliding linearly.
      const eased = local * local * (3 - 2 * local);
      assembly.pivot.position
        .copy(assembly.offset)
        .multiplyScalar(eased)
        .add(assembly.rest);
      lowest = Math.min(
        lowest,
        assembly.bounds.min.y + assembly.offset.y * eased
      );
    }
    // The floor follows the lowest part, so parts never sink through it.
    this.ground.position.y = Math.min(0, lowest);
    this.shadowsMoving = true;
    this.invalidate();
  }

  /** Enlarge and turn one part toward the viewer; the rest give way. */
  setFocus(id: string | null) {
    for (const assembly of this.assemblies) {
      const active = assembly.id === id;
      const scale = id === null ? 1 : active ? 1.14 : 0.9;
      gsap.to(assembly.pivot.scale, {
        x: scale,
        y: scale,
        z: scale,
        duration: 0.6,
        ease: "power3.out",
        overwrite: true,
        onUpdate: this.invalidate,
      });
      gsap.to(assembly.pivot.rotation, {
        y: active ? 0.45 : 0,
        duration: 0.8,
        ease: "power3.out",
        overwrite: true,
        onUpdate: () => {
          this.shadowsMoving = true;
          this.invalidate();
        },
      });
    }
  }

  /** A part's current on-screen rectangle, from its bounds and travel. */
  partRect(id: string) {
    const assembly = this.assemblies.find((entry) => entry.id === id);
    if (!assembly) return null;
    const parent = assembly.pivot.parent ?? assembly.pivot;
    const shift = assembly.pivot.position
      .clone()
      .sub(assembly.rest)
      .applyMatrix3(new THREE.Matrix3().setFromMatrix4(parent.matrixWorld));
    const box = assembly.bounds.clone().translate(shift);
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    for (let corner = 0; corner < 8; corner++) {
      this.projected
        .set(
          corner & 1 ? box.max.x : box.min.x,
          corner & 2 ? box.max.y : box.min.y,
          corner & 4 ? box.max.z : box.min.z
        )
        .project(this.camera);
      const x = ((this.projected.x + 1) / 2) * this.width;
      const y = ((1 - this.projected.y) / 2) * this.height;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    return { left, top, right, bottom };
  }

  /** World bounds of a part where it currently sits (after explode travel). */
  private currentBounds(id: string) {
    const assembly = this.assemblies.find((entry) => entry.id === id);
    if (!assembly) return null;
    const parent = assembly.pivot.parent ?? assembly.pivot;
    const shift = assembly.pivot.position
      .clone()
      .sub(assembly.rest)
      .applyMatrix3(new THREE.Matrix3().setFromMatrix4(parent.matrixWorld));
    return assembly.bounds.clone().translate(shift);
  }

  /**
   * Camera pose that brings one part in close, keeping the current viewing
   * direction. Wide screens frame it left of centre to leave room for the
   * details panel on the right.
   */
  focusPose(id: string, narrow: boolean): CameraPose | null {
    const box = this.currentBounds(id);
    if (!box) return null;
    const centre = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const direction = new THREE.Vector3()
      .copy(this.rig.position)
      .sub(this.rig.target)
      .normalize();
    const distance =
      // Room for the hover scale-up and turn, so nothing crops.
      // On phones render() keeps its portrait pull-back, so width still
      // fits: close-up parts are wider than they are tall.
      (radius / Math.sin(fov / 2)) * (narrow ? 1.3 : 1.15);
    const eye = centre.clone().addScaledVector(direction, distance);
    return {
      camera: [eye.x, eye.y, eye.z],
      target: [centre.x, centre.y, centre.z],
      frameOffset: narrow ? 0 : -0.14,
    };
  }

  /**
   * Draw one part alone, full size and with a transparent background, into
   * `target`. Laid over the canvas while the live scene underneath is blurred
   * with CSS, it keeps the selected part sharp and the rest soft, without a
   * post-processing pass. Rendered and copied in one task, so no flicker.
   */
  captureIsolated(id: string, target: HTMLCanvasElement) {
    const canvas = this.renderer.domElement;
    target.width = canvas.width;
    target.height = canvas.height;
    const context = target.getContext("2d");
    if (!context) return;
    for (const assembly of this.assemblies) {
      assembly.pivot.visible = assembly.id === id;
    }
    this.ground.visible = false;
    this.render();
    context.clearRect(0, 0, target.width, target.height);
    context.drawImage(canvas, 0, 0);
    for (const assembly of this.assemblies) assembly.pivot.visible = true;
    this.ground.visible = true;
    this.render();
  }

  /**
   * A small transparent image of each part for its card, rendered once from
   * the assembled model: every other part hidden, framed from a
   * three-quarter angle, drawn into a corner of the canvas and copied out in
   * the same task (so no flicker, and no preserveDrawingBuffer needed).
   */
  snapshotParts(size = 160) {
    const images: Record<string, string> = {};
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
    const ratio = this.renderer.getPixelRatio();
    const pixels = Math.round(size * ratio);
    const copy = document.createElement("canvas");
    copy.width = copy.height = pixels;
    const context = copy.getContext("2d");
    if (!context) return images;

    this.ground.visible = false;
    const previousClear = this.renderer.getClearAlpha();
    this.renderer.setClearAlpha(0);
    this.renderer.setScissorTest(true);
    for (const assembly of this.assemblies) {
      for (const other of this.assemblies)
        other.pivot.visible = other === assembly;
      const centre = assembly.bounds.getCenter(new THREE.Vector3());
      const radius = assembly.bounds.getSize(new THREE.Vector3()).length() / 2;
      const distance = (radius / Math.sin(THREE.MathUtils.degToRad(15))) * 1.05;
      camera.position
        .set(0.75, 0.35, 0.56)
        .normalize()
        .multiplyScalar(distance)
        .add(centre);
      camera.lookAt(centre);
      this.renderer.setViewport(0, 0, size, size);
      this.renderer.setScissor(0, 0, size, size);
      this.renderer.clear();
      this.renderer.render(this.scene, camera);
      const canvas = this.renderer.domElement;
      context.clearRect(0, 0, pixels, pixels);
      context.drawImage(
        canvas,
        0,
        canvas.height - pixels,
        pixels,
        pixels,
        0,
        0,
        pixels,
        pixels
      );
      images[assembly.id] = copy.toDataURL("image/png");
    }
    for (const assembly of this.assemblies) assembly.pivot.visible = true;
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.setClearAlpha(previousClear);
    this.ground.visible = true;
    this.render();
    return images;
  }

  /** Debug: tint each assembly a flat colour to check the partition. */
  tintAssemblies(on: boolean) {
    const colours = [
      0xe8453c, 0xf2f2f2, 0x3c8be8, 0xf2c53c, 0x3cc47a, 0xb05cf0,
    ];
    this.assemblies.forEach((assembly, index) => {
      assembly.pivot.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (on) {
          object.userData.untinted ??= object.material;
          const tint = (object.material as THREE.MeshStandardMaterial).clone();
          tint.map = null;
          tint.color.setHex(colours[index % colours.length] ?? 0xffffff);
          object.material = tint;
        } else if (object.userData.untinted) {
          object.material = object.userData.untinted;
        }
      });
    });
    this.invalidate();
  }

  /** Snap straight to a pose, no tween. */
  applyPose(pose: CameraPose) {
    this.rig.position.set(...pose.camera);
    this.rig.target.set(...pose.target);
    this.rig.frameOffset = pose.frameOffset;
    this.invalidate();
  }

  /** Ask for one render on the next tick. Arrow so GSAP can call it bare. */
  invalidate = () => {
    this.dirty = true;
  };

  private resize() {
    this.width = Math.max(1, this.stage.clientWidth);
    this.height = Math.max(1, this.stage.clientHeight);
    const aspect = this.width / this.height;

    this.isNarrow = this.width < NARROW_BREAKPOINT;
    // The field of view is vertical, so a portrait screen crops the model's
    // width. Pull the camera back to compensate instead of widening the lens,
    // which would distort the product.
    this.distanceScale = aspect >= 1 ? 1 : Math.min(1.8, 0.9 / aspect);

    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, coarsePointer ? 1.5 : 2)
    );
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = aspect;
    this.invalidate();
  }

  private tick = () => {
    if (!this.dirty || !this.hasModel) return;
    this.dirty = false;
    this.render();
  };

  private render() {
    if (this.controls) {
      // Debug: OrbitControls owns the camera directly.
      this.controls.update();
    } else {
      this.camera.position
        .copy(this.rig.position)
        .sub(this.rig.target)
        .multiplyScalar(this.distanceScale)
        .add(this.rig.target);
      this.camera.lookAt(this.rig.target);
    }

    const offsetX = this.isNarrow ? 0 : -this.rig.frameOffset * this.width;
    const offsetY = this.isNarrow ? this.rig.frameLift * this.height : 0;
    // setViewOffset shifts where the model sits in frame without changing the
    // perspective, and updates the projection matrix itself.
    this.camera.setViewOffset(
      this.width,
      this.height,
      offsetX,
      offsetY,
      this.width,
      this.height
    );

    if (this.shadowsMoving) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowsMoving = false;
    }
    // Seen from underneath, the shadow floor would lie over the model's
    // base, so drop it while the camera is below it. The material's flag,
    // not the mesh's: the capture methods own `ground.visible`.
    (this.ground.material as THREE.Material).visible =
      this.camera.position.y > this.ground.position.y + 0.005;
    this.renderer.render(this.scene, this.camera);
    for (const listener of this.renderListeners) listener();
  }

  /**
   * Run `listener` after every render. Rendering is on demand, so DOM that
   * tracks the model (hotspots) moves in the same frame and idles with it.
   * Returns an unsubscribe function.
   */
  onRender(listener: () => void) {
    this.renderListeners.add(listener);
    this.invalidate();
    return () => {
      this.renderListeners.delete(listener);
    };
  }

  private projected = new THREE.Vector3();
  private towardCamera = new THREE.Vector3();
  private surfaceNormal = new THREE.Vector3();

  /**
   * Where a world point lands on the stage, through the current camera and
   * view offset. `facing` is whether the surface normal points toward the
   * camera, used to hide markers on the far side of the model.
   */
  project(point: Vec3, normal: Vec3): ScreenPoint {
    this.projected.set(...point);
    this.towardCamera.copy(this.camera.position).sub(this.projected);
    this.surfaceNormal.set(...normal).normalize();
    const facing = this.towardCamera.dot(this.surfaceNormal) > 0;

    this.projected.project(this.camera);
    return {
      x: ((this.projected.x + 1) / 2) * this.width,
      y: ((1 - this.projected.y) / 2) * this.height,
      // z >= 1 means behind the camera or past the far plane.
      facing: facing && this.projected.z < 1,
    };
  }

  /** `?debug`: orbit freely and log poses to paste into lib/products.ts. */
  async enableDebug(chapters: { id: string; pose: CameraPose }[]) {
    const [{ OrbitControls }, { default: GUIClass }] = await Promise.all([
      import("three/addons/controls/OrbitControls.js"),
      import("lil-gui"),
    ]);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.rig.target);
    this.camera.position.copy(this.rig.position);
    this.controls.addEventListener("change", this.invalidate);

    const round = (value: number) => Math.round(value * 1000) / 1000;
    const params = {
      chapter: chapters[0]?.id ?? "",
      frameOffset: this.rig.frameOffset,
      logPose: () => {
        const pose = {
          camera: this.camera.position.toArray().map(round),
          target: this.controls?.target.toArray().map(round),
          frameOffset: round(this.rig.frameOffset),
        };
        logger.info(`[pose] ${params.chapter}`, JSON.stringify(pose));
      },
    };

    this.gui = new GUIClass({ title: "Camera poses" });
    this.gui
      .add(
        params,
        "chapter",
        chapters.map((chapter) => chapter.id)
      )
      .onChange((id: string) => {
        const chapter = chapters.find((entry) => entry.id === id);
        if (!chapter || !this.controls) return;
        this.applyPose(chapter.pose);
        this.camera.position.copy(this.rig.position);
        this.controls.target.copy(this.rig.target);
        params.frameOffset = chapter.pose.frameOffset;
        this.gui?.controllersRecursive().forEach((controller) => {
          controller.updateDisplay();
        });
      });
    this.gui
      .add(params, "frameOffset", -0.3, 0.3, 0.01)
      .onChange((value: number) => {
        this.rig.frameOffset = value;
        this.invalidate();
      });
    this.gui.add(params, "logPose").name("Log pose");
    // Debug-only handle for scripting poses from the console.
    Object.assign(window, { productScene: this });
    this.invalidate();
  }

  dispose() {
    this.renderListeners.clear();
    gsap.ticker.remove(this.tick);
    this.resizeObserver.disconnect();
    // Cancels an in-flight GLB fetch; `load()` then rejects.
    this.manager.abort();

    this.gui?.destroy();
    this.controls?.removeEventListener("change", this.invalidate);
    this.controls?.dispose();

    // WebGL resources aren't garbage collected; leaking them across Fast
    // Refresh degrades the page within a few edits.
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      }
    });
    this.keyLight.shadow.map?.dispose();
    this.environmentTarget.dispose();
    this.environment.dispose();
    this.pmrem.dispose();

    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
