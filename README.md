# Roboto 3D Viewer

Interactive 3D product pages, edited in Sanity. Visitors can rotate the model,
open numbered hotspots, and pull it apart in an exploded view. Editors set up
every hotspot and camera angle by clicking on the model in Sanity Studio.
Nobody has to touch code.

- **Live site:** [roboto-3d-viewer.vercel.app](https://roboto-3d-viewer.vercel.app)
- **Studio:** [roboto-3d-viewer.sanity.studio](https://roboto-3d-viewer.sanity.studio) (needs access to the Sanity project)

A Roboto Studio demo, built on our open-source
[Turbo Start Sanity](https://github.com/robotostudio/turbo-start-sanity)
template. "Cobot C6" is a made-up product.

## What's in it

- **3D viewer** (`packages/product-3d`). Plain three.js driven by GSAP, with no React Three Fiber:
  - drag to rotate, plus zoom;
  - numbered hotspots with a details panel;
  - an exploded view that splits the model into assemblies;
  - a fullscreen dialog.

  three.js loads lazily, only when a viewer gets near the viewport.
- **Studio authoring** (`apps/studio/components/model-picker`). On a product's **3D** tab:
  - click **Add hotspot**, then click the model;
  - select a dot to move it, or orbit and press **Use this view** to save its camera shot.
- **Where the viewer shows on the site:**
  - `/products`, an index of every product;
  - `/products/<slug>`, a gallery with an **Explore in 3D** button that opens the viewer fullscreen, plus specs and FAQs;
  - a **3D Product Viewer** page-builder block, to drop the inline viewer on any page.
- **Cutout hero:** the **Hero Split** block has a "Cutout" layout, which puts a transparent image full-height on the left with the text on the right.

Everything else (page builder, blog, SEO, Visual Editing, Markdown for LLMs)
comes from Turbo Start Sanity; see its README for the details.

## Run it locally

You need Node 24 and pnpm 11 (pinned through `packageManager`, so run `corepack enable`).

```sh
git clone https://github.com/robotostudio/roboto-3d-viewer.git
cd roboto-3d-viewer
corepack enable
pnpm install
```

1. **Create a Sanity project** at [sanity.io/manage](https://www.sanity.io/manage).
   - Create two API tokens: one with the **Viewer** role, one with the **Editor** role.
   - Add `http://localhost:3000` to CORS origins, with credentials allowed.
2. **Create the env files.** Copy the examples:

   ```sh
   cp apps/web/.env.example apps/web/.env.local
   cp apps/studio/.env.example apps/studio/.env.local
   ```

   In `apps/web/.env.local`:
   - `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`
   - `NEXT_PUBLIC_SANITY_STUDIO_URL=http://localhost:3333`
   - `SANITY_API_READ_TOKEN`: the Viewer token
   - `SANITY_API_WRITE_TOKEN`: the Editor token, which the seed script uses

   In `apps/studio/.env.local`:
   - `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`
   - `SANITY_STUDIO_PRESENTATION_URL=http://localhost:3000`
3. **Seed the demo content.** This uploads the robot arm model and its gallery
   images, and creates the product with its hotspots and exploded view, the home
   page, the navbar, the footer and the settings:

   ```sh
   pnpm --filter studio seed:demo
   ```

4. **Start everything:**

   ```sh
   pnpm dev
   ```

   The site runs on [localhost:3000](http://localhost:3000) and the Studio on [localhost:3333](http://localhost:3333).

## Add your own model

1. **Optimise the GLB** with meshopt geometry and WebP textures. Keep the meshes separate, or the exploded view has nothing to split:

   ```sh
   pnpm dlx @gltf-transform/cli optimize in.glb out.glb --compress meshopt \
     --texture-compress webp --texture-size 2048 --join false --flatten false \
     --instance false --palette false --simplify false
   ```

   Models should be in metres with +Y up, and the origin at the centre of the base.
2. **In Studio,** upload it under **3D models**.
3. **Create a product** and pick the model on its **3D** tab.
4. **Set it up:**
   - press **Use this view** for the starting shot;
   - add hotspots;
   - group the parts into exploded-view assemblies.

   Assembly rules match each piece by its position or mesh name, and the first matching assembly wins.
5. **Fine-tune** by adding `?debug` to the product page. That gives you orbit controls, a pose panel, and "Log pose", which prints the values as JSON.

Before using any downloaded model in public, check its licence (NC licences don't allow commercial use) and its textures (manufacturer logos are often baked in).

## Deploy

- **Web:** a Vercel project with **Root Directory** set to `apps/web`, and the same env vars as `apps/web/.env.local`.
- **Studio:** run `pnpm --filter studio deploy`. The script sets the production preview URL, and `sanity.cli.ts` holds the app ID.
- **CORS:** add the live and preview domains to Sanity's CORS origins.

## Credits

- **3D model:** ["6 Axis Industrial Robot Arm"](https://sketchfab.com/3d-models/6-axis-industrial-robot-arm-3ecc74c22c584b2b8295f17dedcdb89f) by [Jayson Stauffer](https://sketchfab.com/JaysonStauffer), licensed [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
  - Modified by Roboto Studio: the manufacturer logos were removed from the textures, and the model was re-centred and renamed.
  - The credit also shows in the viewer and the site footer.
- **Template:** [Turbo Start Sanity](https://github.com/robotostudio/turbo-start-sanity) by [Roboto Studio](https://robotostudio.com), MIT.
