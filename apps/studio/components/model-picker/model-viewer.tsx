import { Box, Card, Flex, Spinner, Text } from "@sanity/ui";
import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * A plain three.js view of a product's GLB for Studio inputs. The model is
 * added exactly as the site's ProductScene adds it (no recentring or
 * scaling), so a point clicked here is the same point on the site.
 */

export type Point = { x: number; y: number; z: number };
export type View = { camera: Point; target: Point };
export type Marker = {
  key: string;
  label: string;
  anchor: Point;
  normal: Point;
};
export type ModelViewerHandle = {
  getView: () => View | null;
  flyTo: (view: View) => void;
};

type Props = {
  url: string;
  /** Where the camera starts; framed to fit the model when absent. */
  view?: View;
  markers?: Marker[];
  activeKey?: string;
  /** While true, a click on the model calls onPick instead of orbiting. */
  picking?: boolean;
  onPick?: (anchor: Point, normal: Point) => void;
  onSelect?: (key: string) => void;
  height?: number;
  ref?: Ref<ModelViewerHandle>;
};

// Same field of view as the site's viewer, so framing matches.
const FIELD_OF_VIEW = 30;
const round = (value: number) => Math.round(value * 1000) / 1000;
const toPoint = (v: THREE.Vector3): Point => ({
  x: round(v.x),
  y: round(v.y),
  z: round(v.z),
});
const toVector = ({ x, y, z }: Point) => new THREE.Vector3(x, y, z);

type Projected = { key: string; x: number; y: number; facing: boolean };

type Stage = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: THREE.Object3D | null;
  render: () => void;
};

export function ModelViewer({
  url,
  view,
  markers = [],
  activeKey,
  picking = false,
  onPick,
  onSelect,
  height = 420,
  ref,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [projected, setProjected] = useState<Projected[]>([]);

  // Latest props for callbacks that live inside the three.js setup.
  const latest = useRef({ markers, picking, onPick, view });
  latest.current = { markers, picking, onPick, view };

  const project = useCallback(() => {
    const stage = stageRef.current;
    const host = hostRef.current;
    if (!(stage && host)) return;
    const { width, height: h } = host.getBoundingClientRect();
    const eye = stage.camera.position;
    setProjected(
      latest.current.markers.map((marker) => {
        const anchor = toVector(marker.anchor);
        const screen = anchor.clone().project(stage.camera);
        const toCamera = eye.clone().sub(anchor);
        return {
          key: marker.key,
          x: ((screen.x + 1) / 2) * width,
          y: ((1 - screen.y) / 2) * h,
          facing: toCamera.dot(toVector(marker.normal)) > 0,
        };
      })
    );
  }, []);

  // Build the scene once per model URL; tear everything down on unmount.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    setStatus("loading");

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Neutral keeps the model's own colours (ACES washes the orange out).
    renderer.toneMapping = THREE.NeutralToneMapping;
    host.prepend(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    // Same lighting as the site's viewer, so the model looks the same here.
    scene.environmentIntensity = 1.1;
    renderer.toneMappingExposure = 1.1;
    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(0.7, 1.6, 1.1);
    scene.add(keyLight);

    const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 0.01, 20);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;

    const render = () => {
      renderer.render(scene, camera);
      project();
    };
    controls.addEventListener("change", render);

    const stage: Stage = { renderer, camera, controls, model: null, render };
    stageRef.current = stage;

    const resize = () => {
      const { width, height: h } = host.getBoundingClientRect();
      if (width === 0 || h === 0) return;
      renderer.setSize(width, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = width / h;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader
      .loadAsync(url)
      .then((gltf) => {
        if (disposed) return;
        // Blender exports KHR_materials_specular at 2×; cap it as the site does.
        gltf.scene.traverse((object) => {
          if (
            object instanceof THREE.Mesh &&
            object.material instanceof THREE.MeshPhysicalMaterial &&
            object.material.specularColor.r > 1
          ) {
            object.material.specularColor.setScalar(1);
          }
        });
        scene.add(gltf.scene);
        stage.model = gltf.scene;
        const start = latest.current.view;
        if (start) {
          camera.position.copy(toVector(start.camera));
          controls.target.copy(toVector(start.target));
        } else {
          // Three-quarter view that fits the whole model.
          const bounds = new THREE.Box3().setFromObject(gltf.scene);
          const sphere = bounds.getBoundingSphere(new THREE.Sphere());
          const distance =
            sphere.radius /
            Math.sin(THREE.MathUtils.degToRad(FIELD_OF_VIEW) / 2);
          controls.target.copy(sphere.center);
          camera.position
            .copy(sphere.center)
            .add(
              new THREE.Vector3(1, 0.6, 1).normalize().multiplyScalar(distance)
            );
        }
        controls.update();
        resize();
        setStatus("ready");
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      stageRef.current = null;
      observer.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) material.dispose();
      });
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [url, project]);

  // Follow the stored values: undo, history and other editors move the dots.
  // Keyed on content, since callers pass a fresh array every render.
  const markerKey = JSON.stringify(markers);
  // biome-ignore lint/correctness/useExhaustiveDependencies: markerKey stands in for markers
  useEffect(() => {
    project();
  }, [markerKey, project]);

  // A click (not a drag) on the model, while picking, reports the surface.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = stage?.renderer.domElement;
    if (!(stage && canvas) || status !== "ready") return;
    let down: { x: number; y: number } | null = null;

    const onPointerDown = (event: PointerEvent) => {
      down = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      const start = down;
      down = null;
      const { picking: isPicking, onPick: pick } = latest.current;
      if (!(start && isPicking && pick && stage.model)) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, stage.camera);
      const hit = raycaster.intersectObject(stage.model, true)[0];
      if (!hit?.face) return;
      const normal = hit.face.normal
        .clone()
        .transformDirection(hit.object.matrixWorld)
        .normalize();
      // A face seen from behind (thin or open meshes): flip toward the camera.
      if (normal.dot(raycaster.ray.direction) > 0) normal.negate();
      pick(toPoint(hit.point), toPoint(normal));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [status]);

  useEffect(() => {
    const canvas = stageRef.current?.renderer.domElement;
    if (canvas) canvas.style.cursor = picking ? "crosshair" : "grab";
  }, [picking, status]);

  useImperativeHandle(
    ref,
    () => ({
      getView: () => {
        const stage = stageRef.current;
        if (!stage) return null;
        return {
          camera: toPoint(stage.camera.position),
          target: toPoint(stage.controls.target),
        };
      },
      flyTo: (next) => {
        const stage = stageRef.current;
        if (!stage) return;
        const fromCamera = stage.camera.position.clone();
        const fromTarget = stage.controls.target.clone();
        const toCamera = toVector(next.camera);
        const toTarget = toVector(next.target);
        const startTime = performance.now();
        const step = (now: number) => {
          if (stageRef.current !== stage) return;
          const t = Math.min((now - startTime) / 600, 1);
          const eased = 1 - (1 - t) ** 3;
          stage.camera.position.lerpVectors(fromCamera, toCamera, eased);
          stage.controls.target.lerpVectors(fromTarget, toTarget, eased);
          stage.controls.update();
          stage.render();
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
    }),
    []
  );

  const labelFor = new Map(markers.map((m, i) => [m.key, { m, i }]));

  return (
    <Card border radius={2} overflow="hidden" tone="transparent">
      <div
        ref={hostRef}
        style={{ position: "relative", height, touchAction: "none" }}
      >
        {status !== "ready" && (
          <Flex
            align="center"
            justify="center"
            style={{ position: "absolute", inset: 0 }}
          >
            {status === "loading" ? (
              <Spinner muted />
            ) : (
              <Text muted size={1}>
                The 3D model couldn't be loaded.
              </Text>
            )}
          </Flex>
        )}
        {status === "ready" &&
          projected.map((point) => {
            const entry = labelFor.get(point.key);
            if (!entry) return null;
            const active = point.key === activeKey;
            return (
              <button
                key={point.key}
                type="button"
                title={entry.m.label}
                onClick={() => onSelect?.(point.key)}
                style={{
                  position: "absolute",
                  left: point.x,
                  top: point.y,
                  transform: "translate(-50%, -50%)",
                  opacity: point.facing ? 1 : 0.35,
                  padding: "2px 6px",
                  font: "600 11px/16px ui-monospace, monospace",
                  color: active ? "#fff" : "#101112",
                  background: active ? "#002160" : "#fff",
                  border: `1px solid ${active ? "#002160" : "#747878"}`,
                  cursor: "pointer",
                  pointerEvents: picking ? "none" : "auto",
                }}
              >
                {String(entry.i + 1).padStart(2, "0")}
              </button>
            );
          })}
      </div>
      {picking && (
        <Box padding={2}>
          <Text size={1} muted>
            Click the model where the point should go.
          </Text>
        </Box>
      )}
    </Card>
  );
}
