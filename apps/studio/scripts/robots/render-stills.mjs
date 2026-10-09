/**
 * Renders gallery stills for each demo model: four views on a transparent
 * background, written as WebP to scripts/data/stills/<slug>/.
 *
 *   node apps/studio/scripts/robots/render-stills.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../../../..");
const data = join(here, "../data");
const { chromium } = createRequire(join(repo, "apps/web/package.json"))(
  "@playwright/test"
);
const THREE = "https://cdn.jsdelivr.net/npm/three@0.186.0";

// Camera direction for each view (normalised later), looking at the centre.
// Gallery views are square and fit the whole model; `hero` is a tall
// portrait cutout whose height the model fills, for the home page hero.
const VIEWS = {
  overview: { dir: [0.75, 0.45, 0.9], width: 2048, height: 2048 },
  front: { dir: [0.05, 0.25, 1], width: 2048, height: 2048 },
  side: { dir: [1, 0.2, 0.05], width: 2048, height: 2048 },
  back: { dir: [-0.7, 0.4, -0.85], width: 2048, height: 2048 },
  hero: { dir: [0.9, 0.18, 0.75], width: 2000, height: 3000, fitHeight: true },
};

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
for (const slug of ["cobot-c6"]) {
  const glb = readFileSync(join(data, "models", `${slug}.glb`)).toString(
    "base64"
  );
  const out = join(data, "stills", slug);
  mkdirSync(out, { recursive: true });
  for (const [view, { dir, width, height, fitHeight }] of Object.entries(
    VIEWS
  )) {
    const page = await browser.newPage({
      viewport: { width, height },
    });
    page.on("pageerror", (error) => console.error(slug, view, error.message));
    await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
<script type="importmap">{"imports":{"three":"${THREE}/build/three.module.js","three/addons/":"${THREE}/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(${width}, ${height});
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const bytes = Uint8Array.from(atob("${glb}"), (c) => c.charCodeAt(0));
new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(bytes.buffer, "", (gltf) => {
  scene.add(gltf.scene);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const centre = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
  const camera = new THREE.PerspectiveCamera(30, ${width} / ${height}, 0.01, 100);
  const direction = new THREE.Vector3(${dir.join(",")}).normalize();
  if (${Boolean(fitHeight)}) {
    // Tight fit: step back until every corner of the box is inside the
    // frame, so the model fills the height with only a small margin.
    const corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    let distance = radius;
    for (let step = 0; step < 400; step++) {
      camera.position.copy(centre).addScaledVector(direction, distance);
      camera.lookAt(centre); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      const fits = corners.every((c) => { const p = c.clone().project(camera); return Math.abs(p.x) <= 0.96 && Math.abs(p.y) <= 0.97; });
      if (fits) break;
      distance *= 1.01;
    }
  } else {
    camera.position.copy(centre).addScaledVector(direction, radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.05);
    camera.lookAt(centre);
  }
  renderer.render(scene, camera);
  // WebP with alpha, encoded by the browser (no external encoder needed).
  // The hero is cropped to the model's visible pixels, so it fills the frame.
  let source = renderer.domElement;
  if (${Boolean(fitHeight)}) {
    const gl = renderer.getContext();
    const w = source.width, h = source.height;
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (pixels[(y * w + x) * 4 + 3] > 8) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    }
    const pad = Math.round(h * 0.01);
    const cw = maxX - minX + 1 + pad * 2, ch = maxY - minY + 1 + pad * 2;
    const crop = document.createElement("canvas");
    crop.width = cw; crop.height = ch;
    // readPixels is bottom-up; the canvas source is top-down.
    crop.getContext("2d").drawImage(source, minX - pad, h - maxY - 1 - pad, cw, ch, 0, 0, cw, ch);
    source = crop;
  }
  window.__webp = source.toDataURL("image/webp", 0.92);
});
</script></body></html>`);
    await page.waitForFunction(() => window.__webp, null, { timeout: 60_000 });
    const dataUrl = await page.evaluate(() => window.__webp);
    writeFileSync(
      join(out, `${view}.webp`),
      Buffer.from(dataUrl.replace(/^data:image\/webp;base64,/, ""), "base64")
    );
    await page.close();
    console.log(`${slug}/${view}.webp`);
  }
}
await browser.close();
