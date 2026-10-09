/**
 * The shape the 3D viewer renders. Built from Sanity's `product` document by
 * ./map-product.ts. Units are metres; the model's origin sits at the centre
 * of its base with +Y up.
 *
 * Tune poses live with `?debug` on the product page's 3D viewer, then paste
 * the logged values into the product's 3D tab in Studio.
 */

export type Vec3 = readonly [number, number, number];

export type CameraPose = {
  camera: Vec3;
  target: Vec3;
  /**
   * Horizontal framing on wide screens, as a fraction of the viewport width.
   * Positive pushes the model right (copy on the left), negative pushes it
   * left. Ignored on narrow screens, where the model is centred above copy.
   */
  frameOffset: number;
};

/**
 * Pieces of a mesh to re-render as polished chrome, for source-model faults
 * baked into shared textures. Every connected piece of `mesh` taller than
 * `minHeight` metres is split off. `mesh` is the three.js node name (GLTFLoader
 * strips dots: "black_part.001" becomes "black_part001").
 */
export type ChromeFix = { mesh: string; minHeight: number };

/** A clickable point on the model for the explorer page. */
export type Hotspot = {
  id: string;
  /** Short name shown next to the dot. */
  label: string;
  title: string;
  body: string;
  specs: string[];
  /** Where the dot sits on the model, in metres. */
  anchor: Vec3;
  /** Which way that surface faces; the dot hides when it faces away. */
  normal: Vec3;
  /** Camera pose when this hotspot is open. */
  pose: CameraPose;
};

/**
 * A box test on a piece's centre (model Y-up metres); every bound given must
 * hold. `meshIncludes` also matches on the three.js mesh name.
 */
export type PieceTest = Partial<
  Record<"xMin" | "xMax" | "yMin" | "yMax" | "zMin" | "zMax", number>
> & { meshIncludes?: string };

/** One functional assembly of the exploded view. */
export type ExplodePart = {
  id: string;
  label: string;
  /** Short sourced spec; omitted where there's no published figure. */
  spec?: string;
  /** One line for the part's card. */
  description: string;
  /** Selected-part panel: a fuller paragraph and spec chips. */
  detail: string;
  specs: string[];
  /** Pieces matching any test belong here; rules are tried in order. */
  any: PieceTest[];
  /** 0 to 1: when in the explode this part starts moving, for a stagger. */
  delay: number;
};

export type ExplodeConfig = {
  /** Pieces no rule claims fall into this assembly. */
  fallback: string;
  parts: ExplodePart[];
  /** Order of the exploded row, first part on the left (top on phones). */
  order: string[];
  /** Space between parts in the row, metres. */
  gap: number;
  /** Camera while assembled; the exploded camera is computed from the row. */
  assembledPose: CameraPose;
  /** Heading of the closing section, e.g. "Five assemblies. One …". */
  closing: string;
};

export type Product = {
  /** URL segment: /products/<slug>. */
  slug: string;
  name: string;
  /** What the product is, e.g. "Six-axis robot arm". */
  category: string;
  /** The GLB, served from Sanity's CDN. */
  modelUrl: string;
  /** Shown in the 3D viewer, e.g. when the model is a stand-in. */
  modelNote?: string;
  chromeFixes?: ChromeFix[];
  /** The centred starting view people orbit from. */
  overviewPose: CameraPose;
  hotspots?: Hotspot[];
  /** The viewer's "Exploded view": how the model splits into assemblies. */
  explode?: ExplodeConfig;
};
