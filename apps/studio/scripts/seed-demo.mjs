/**
 * Seeds the Roboto 3D Viewer demo: three original robot models (built by
 * scripts/robots/build-robots.mjs), their product pages with hotspots and
 * exploded views, the home page, navbar, footer and site settings.
 *
 *   pnpm --filter studio seed:demo
 *
 * Fixed ids and keys, so re-running replaces rather than duplicates. Uploaded
 * files dedupe by content, so re-uploading is a no-op.
 */
import { createReadStream } from "node:fs";
import { createClient } from "@sanity/client";
import { Logger } from "@workspace/logger";

const logger = new Logger("seed-demo");

for (const name of [
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  "NEXT_PUBLIC_SANITY_DATASET",
  "SANITY_API_WRITE_TOKEN",
]) {
  if (!process.env[name]) {
    throw new Error(`${name} is missing: fill in apps/web/.env.local first.`);
  }
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: "2025-08-29",
  useCdn: false,
});

const DATA = new URL("./data/", import.meta.url);
const STUDIO_URL = "https://roboto-3d-viewer.sanity.studio";

const vec3 = ([x, y, z]) => ({ _type: "vec3", x, y, z });
const pose = ({ camera, target, frameOffset = 0 }) => ({
  _type: "cameraPose",
  camera: vec3(camera),
  target: vec3(target),
  frameOffset,
});
const row =
  (key) =>
  ([label, value]) => ({
    _type: "labelValue",
    _key: `${key}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label,
    value,
  });
const text = (key, ...paragraphs) =>
  paragraphs.map((paragraph, index) => ({
    _key: `${key}-p${index}`,
    _type: "block",
    style: "normal",
    markDefs: [],
    children: [
      { _key: `${key}-s${index}`, _type: "span", marks: [], text: paragraph },
    ],
  }));
const link = (href, openInNewTab = false) => ({
  _type: "customUrl",
  type: "external",
  external: href,
  href,
  openInNewTab,
});
const internal = (ref) => ({
  _type: "customUrl",
  type: "internal",
  internal: { _type: "reference", _ref: ref },
  openInNewTab: false,
});
const button = (key, label, url, variant = "default") => ({
  _key: key,
  _type: "button",
  text: label,
  url,
  variant,
});

/** The demo fleet. Positions match the geometry in scripts/robots/robots.js. */
/**
 * 3D model: "6 Axis Industrial Robot Arm" by Jayson Stauffer, CC BY 4.0
 * (https://sketchfab.com/3d-models/6-axis-industrial-robot-arm-3ecc74c22c584b2b8295f17dedcdb89f).
 * Modified by Roboto Studio: manufacturer logos removed, re-centred. The
 * product name and copy are made up for the demo.
 */
const MODEL_CREDIT =
  "3D model: “6 Axis Industrial Robot Arm” by Jayson Stauffer, CC BY 4.0, modified.";

/** Removed from the demo; deleted on every run so old seeds don't linger. */
const RETIRED = ["arm-a6", "rover-r2", "drone-d4"];

/** Positions are in the re-centred model: metres, base centre at the origin. */
const ROBOTS = [
  {
    slug: "cobot-c6",
    title: "Cobot C6",
    category: "Six-axis collaborative robot",
    description:
      "A six-axis collaborative arm that works safely alongside people: pick-and-place, machine tending and lab automation without a safety cage.",
    keyFacts: [
      ["Axes", "6"],
      ["Reach", "1,300 mm"],
      ["Payload", "6 kg"],
    ],
    details: [
      "Cobot C6 is built to share a workspace. Force sensing in every joint stops it the moment it touches something it shouldn't, so it can work beside people without a cage.",
      "Teach it a new job by moving the arm by hand, then fine-tune the path on a tablet. The tool flange takes grippers, suction cups and screwdrivers.",
    ],
    specs: [
      ["Repeatability", "±0.03 mm"],
      ["Max tool speed", "2 m/s"],
      ["Protection", "IP54"],
      ["Power", "48 V DC, 350 W"],
    ],
    dimensions: [
      ["Height (posed)", "1.29 m"],
      ["Base diameter", "190 mm"],
      ["Weight", "24 kg"],
    ],
    faqs: [
      [
        "Does it need a safety cage?",
        "Not for most jobs. Force sensing in each joint stops the arm on contact; a risk assessment for your cell confirms it.",
      ],
      [
        "How do I teach it a path?",
        "Switch to teach mode, guide the arm by hand through the waypoints, then adjust speeds and timing on the tablet.",
      ],
      [
        "Can I change the tool?",
        "Yes. The flange follows the ISO 9409 pattern, so standard grippers and tools bolt straight on.",
      ],
    ],
    modelNote: MODEL_CREDIT,
    overview: { camera: [2.05, 1.4, 1.95], target: [0.12, 0.64, 0] },
    hotspots: [
      {
        id: "flange",
        label: "Tool flange",
        title: "Any tool, bolted straight on.",
        body: "The ISO 9409 flange takes grippers, suction cups and screwdrivers, with power and signals routed through the wrist.",
        specs: ["ISO 9409", "Tool I/O in the wrist"],
        anchor: [0.07, 1.2, -0.49],
        normal: [0, 0, -1],
        pose: {
          camera: [0.95, 1.55, -1.45],
          target: [0.07, 1.18, -0.38],
          frameOffset: -0.2,
        },
      },
      {
        id: "elbow",
        label: "Elbow joint",
        title: "Feels a touch.",
        body: "Torque sensors in every joint notice unexpected contact and stop the arm within milliseconds.",
        specs: ["Force sensing in all 6 joints"],
        anchor: [0.422, 0.865, 0.419],
        normal: [1, 0, 0],
        pose: {
          camera: [1.65, 1.1, 1.1],
          target: [0.36, 0.86, 0.36],
          frameOffset: -0.2,
        },
      },
      {
        id: "shoulder",
        label: "Shoulder joint",
        title: "Lifts 6 kg at full reach.",
        body: "The shoulder carries the heaviest load, so it gets the largest motor and gearbox in the arm.",
        specs: ["6 kg payload", "1,300 mm reach"],
        anchor: [0.482, 0.356, 0],
        normal: [1, 0, 0],
        pose: {
          camera: [1.6, 0.7, 0.7],
          target: [0.4, 0.36, 0],
          frameOffset: -0.2,
        },
      },
      {
        id: "base",
        label: "Base",
        title: "A small footprint.",
        body: "A 190 mm base bolts to a bench, a cart or a machine bed, with the controller and power in a separate compact box.",
        specs: ["190 mm base", "Bench or cart mount"],
        anchor: [0.02, 0.1, 0.2],
        normal: [0, 0.3, 1],
        pose: {
          camera: [0.95, 0.6, 1.5],
          target: [0.02, 0.22, 0],
          frameOffset: -0.2,
        },
      },
    ],
    explode: {
      fallback: "upperArm",
      order: ["base", "lowerArm", "upperArm", "wrist"],
      gap: 0.1,
      closing: "Four assemblies. One arm that works beside people.",
      // Rules are tried in this order (first match wins); `order` sets the row.
      parts: [
        {
          id: "base",
          label: "Base and shoulder",
          spec: "Axes 1–2",
          description: "Turns the arm and lifts it.",
          detail:
            "The base turns the whole arm; the shoulder joint lifts it, with the largest motor in the robot.",
          specs: ["Axes 1–2"],
          rules: [{ yMax: 0.47 }],
          delay: 0,
        },
        {
          id: "wrist",
          label: "Wrist and flange",
          spec: "Axes 5–6",
          description: "Points and turns the tool.",
          detail:
            "Two wrist joints aim the tool; the ISO 9409 flange takes standard grippers.",
          specs: ["Axes 5–6", "ISO 9409 flange"],
          rules: [{ zMax: -0.15 }],
          delay: 0.45,
        },
        {
          id: "lowerArm",
          label: "Lower arm",
          spec: "Axis 3",
          description: "Reaches up to the elbow.",
          detail:
            "A stiff, hollow link with the cabling routed inside, ending in the elbow joint.",
          specs: ["Axis 3", "Internal cabling"],
          rules: [{ xMin: 0.3 }],
          delay: 0.15,
        },
        {
          id: "upperArm",
          label: "Upper arm",
          spec: "Axis 4",
          description: "Carries the wrist out over the work.",
          detail: "The longest link, which sets the arm's reach.",
          specs: ["Axis 4"],
          rules: [],
          delay: 0.3,
        },
      ],
    },
  },
];

const VIEW_ALT = {
  overview: "from three-quarters",
  front: "from the front",
  side: "from the side",
  back: "from behind",
};

async function upload(type, path, filename) {
  const asset = await client.assets.upload(
    type,
    createReadStream(new URL(path, DATA)),
    { filename }
  );
  return asset._id;
}

const transaction = client.transaction();
for (const slug of RETIRED) {
  transaction.delete(`product-${slug}`).delete(`productModel-${slug}`);
}

for (const robot of ROBOTS) {
  const modelId = `productModel-${robot.slug}`;
  const fileId = await upload(
    "file",
    `models/${robot.slug}.glb`,
    `${robot.slug}.glb`
  );
  transaction.createOrReplace({
    _id: modelId,
    _type: "productModel",
    title: robot.title,
    model: { _type: "file", asset: { _type: "reference", _ref: fileId } },
  });

  const gallery = [];
  for (const [view, alt] of Object.entries(VIEW_ALT)) {
    const imageId = await upload(
      "image",
      `stills/${robot.slug}/${view}.webp`,
      `${robot.slug}-${view}.webp`
    );
    gallery.push({
      _type: "image",
      _key: `${robot.slug}-${view}`,
      asset: { _type: "reference", _ref: imageId },
      alt: `${robot.title} ${alt}`,
    });
  }

  transaction.createOrReplace({
    _id: `product-${robot.slug}`,
    _type: "product",
    title: robot.title,
    slug: { _type: "slug", current: `/products/${robot.slug}` },
    category: robot.category,
    description: robot.description,
    gallery,
    keyFacts: robot.keyFacts.map(row(`${robot.slug}-fact`)),
    details: robot.details,
    specs: robot.specs.map(row(`${robot.slug}-spec`)),
    dimensions: robot.dimensions.map(row(`${robot.slug}-dim`)),
    faqs: robot.faqs.map(([question, answer], index) => ({
      _type: "productFaq",
      _key: `${robot.slug}-faq-${index}`,
      question,
      answer,
    })),
    related: ROBOTS.filter((other) => other.slug !== robot.slug).map(
      (other) => ({
        _type: "reference",
        _key: `${robot.slug}-rel-${other.slug}`,
        _ref: `product-${other.slug}`,
      })
    ),
    model: { _type: "reference", _ref: modelId },
    modelNote: robot.modelNote,
    overviewPose: pose(robot.overview),
    hotspots: robot.hotspots.map((hotspot) => ({
      _type: "modelHotspot",
      _key: hotspot.id,
      id: hotspot.id,
      label: hotspot.label,
      title: hotspot.title,
      body: hotspot.body,
      specs: hotspot.specs,
      anchor: vec3(hotspot.anchor),
      normal: vec3(hotspot.normal),
      pose: pose(hotspot.pose),
    })),
    explode: {
      _type: "explodeConfig",
      fallback: robot.explode.fallback,
      order: robot.explode.order,
      gap: robot.explode.gap,
      closing: robot.explode.closing,
      assembledPose: pose(robot.overview),
      parts: robot.explode.parts.map(({ rules, ...part }) => ({
        _type: "explodePart",
        _key: part.id,
        ...part,
        rules: rules.map((rule, index) => ({
          _type: "pieceTest",
          _key: `${part.id}-${index}`,
          ...rule,
        })),
      })),
    },
  });
}

// --- Site: home, navbar, footer, settings ------------------------------

const heroImage = await upload(
  "image",
  "stills/cobot-c6/hero.webp",
  "cobot-c6-hero.webp"
);
const [logo, logoWhite, favicon] = await Promise.all([
  upload("image", "brand/roboto-wordmark.svg", "roboto-wordmark.svg"),
  upload(
    "image",
    "brand/roboto-wordmark-white.svg",
    "roboto-wordmark-white.svg"
  ),
  upload("image", "brand/roboto-r-pink.svg", "roboto-r-pink.svg"),
]);

const SUMMARY =
  "Interactive 3D product pages, edited in Sanity. Rotate the models, open the hotspots and pull them apart in the exploded view.";

transaction.createOrReplace({
  _id: "homePage",
  _type: "homePage",
  title: "Roboto 3D Viewer",
  description: SUMMARY,
  slug: { _type: "slug", current: "/" },
  pageBuilder: [
    {
      _key: "home-hero",
      _type: "heroSplit",
      layout: "cutout",
      title: "Interactive 3D, edited in Sanity",
      subtitle:
        "Product pages where people can rotate the model, open hotspots and pull it apart. Every hotspot and camera angle is set by an editor, not a developer.",
      buttons: [
        button("home-hero-robots", "Explore the robots", link("/products")),
        button(
          "home-hero-studio",
          "Open the Studio",
          link(STUDIO_URL, true),
          "outline"
        ),
      ],
      image: {
        _type: "image",
        asset: { _type: "reference", _ref: heroImage },
        alt: "Cobot C6, a six-axis collaborative robot arm",
      },
    },
    {
      _key: "home-viewer",
      _type: "productViewer",
      eyebrow: "Try it",
      title: "Drag to rotate. Click a number to look closer.",
      description:
        "This is the live viewer, placed on the page as a block. Open it fullscreen for the exploded view.",
      product: { _type: "reference", _ref: "product-cobot-c6" },
    },
    {
      _key: "home-how",
      _type: "featureCardsIcon",
      eyebrow: "How it works",
      title: "Set up in Studio, live on the site",
      richText: text(
        "home-how",
        "Upload a GLB, then set everything else by clicking on the model in Sanity Studio."
      ),
      cards: [
        {
          _key: "home-how-hotspots",
          _type: "featureCardIcon",
          icon: "mouse-pointer-click",
          title: "Click to place hotspots",
          richText: text(
            "home-how-hotspots",
            "Add a hotspot, click the model, and the dot sits right on the surface you clicked."
          ),
        },
        {
          _key: "home-how-camera",
          _type: "featureCardIcon",
          icon: "camera",
          title: "Save camera shots",
          richText: text(
            "home-how-camera",
            "Orbit to the angle you want and press “Use this view”. That's the shot visitors get."
          ),
        },
        {
          _key: "home-how-explode",
          _type: "featureCardIcon",
          icon: "boxes",
          title: "Exploded view",
          richText: text(
            "home-how-explode",
            "Group the model's parts into assemblies, and visitors can split it apart to see how it fits together."
          ),
        },
      ],
    },
  ],
});

transaction.createOrReplace({
  _id: "navbar",
  _type: "navbar",
  label: "Navbar",
  columns: [
    {
      _key: "nav-robots",
      _type: "navbarLink",
      name: "Robots",
      url: link("/products"),
    },
  ],
  buttons: [button("nav-studio", "Open the Studio", link(STUDIO_URL, true))],
});

transaction.createOrReplace({
  _id: "footer",
  _type: "footer",
  label: "Footer",
  subtitle: "A Roboto Studio demo of interactive 3D product pages in Sanity.",
  columns: [
    {
      _key: "footer-robots",
      _type: "footerColumn",
      title: "Robots",
      links: ROBOTS.map((robot) => ({
        _key: `footer-${robot.slug}`,
        _type: "footerColumnLink",
        name: robot.title,
        url: internal(`product-${robot.slug}`),
      })),
    },
    {
      _key: "footer-demo",
      _type: "footerColumn",
      title: "Demo",
      links: [
        {
          _key: "footer-studio",
          _type: "footerColumnLink",
          name: "Sanity Studio",
          url: link(STUDIO_URL, true),
        },
        {
          _key: "footer-roboto",
          _type: "footerColumnLink",
          name: "Roboto Studio",
          url: link("https://robotostudio.com", true),
        },
      ],
    },
  ],
  copyright: `© 2026 Roboto Studio. Cobot C6 is made up. ${MODEL_CREDIT}`,
});

transaction.createOrReplace({
  _id: "settings",
  _type: "settings",
  label: "Settings",
  siteTitle: "Roboto 3D Viewer",
  siteDescription: SUMMARY,
  // Navbar: black wordmark, white in dark mode. Footer: black on its light ground.
  logos: {
    logo: { _type: "image", asset: { _type: "reference", _ref: logo } },
    logoDark: {
      _type: "image",
      asset: { _type: "reference", _ref: logoWhite },
    },
    footerLogo: { _type: "image", asset: { _type: "reference", _ref: logo } },
  },
  favicon: {
    svg: { _type: "image", asset: { _type: "reference", _ref: favicon } },
  },
});

const result = await transaction.commit();
logger.info(`Seeded the demo (${result.results.length} documents).`);
