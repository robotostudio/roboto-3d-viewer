import { stegaClean } from "next-sanity";

import type { CameraPose, PieceTest, Product, Vec3 } from "./types";

type Point = { x: number; y: number; z: number };
type PoseData = {
  camera: Point;
  target: Point;
  frameOffset: number | null;
};
type Maybe<T> = T | null | undefined;
type PieceRuleData = Partial<
  Record<(typeof PIECE_BOUNDS)[number], number | null>
> & { meshIncludes?: string | null };

/**
 * What `product3dFragment` (packages/sanity/src/query.ts) returns. Written
 * structurally so the product route and the productViewer block can both
 * hand their typegen result straight in.
 */
export type Product3dData = {
  name: Maybe<string>;
  slug: Maybe<string>;
  category?: Maybe<string>;
  modelUrl: Maybe<string>;
  modelNote?: Maybe<string>;
  overviewPose: Maybe<PoseData>;
  hotspots?: Maybe<
    {
      id: Maybe<string>;
      label: Maybe<string>;
      title: Maybe<string>;
      body: Maybe<string>;
      specs?: Maybe<string[]>;
      anchor: Maybe<Point>;
      normal: Maybe<Point>;
      pose: Maybe<PoseData>;
    }[]
  >;
  explode?: Maybe<{
    fallback?: Maybe<string>;
    order?: Maybe<string[]>;
    gap?: Maybe<number>;
    closing?: Maybe<string>;
    assembledPose?: Maybe<PoseData>;
    parts?: Maybe<
      {
        id: Maybe<string>;
        label: Maybe<string>;
        spec?: Maybe<string>;
        description?: Maybe<string>;
        detail?: Maybe<string>;
        specs?: Maybe<string[]>;
        delay?: Maybe<number>;
        rules?: Maybe<PieceRuleData[]>;
      }[]
    >;
  }>;
  chromeFixes?: Maybe<{ mesh: Maybe<string>; minHeight: Maybe<number> }[]>;
};

const PIECE_BOUNDS = ["xMin", "xMax", "yMin", "yMax", "zMin", "zMax"] as const;

const vec3 = ({ x, y, z }: Point): Vec3 => [x, y, z];
const pose = ({ camera, target, frameOffset }: PoseData): CameraPose => ({
  camera: vec3(camera),
  target: vec3(target),
  frameOffset: frameOffset ?? 0,
});

/** Null → undefined, so optional fields stay optional. */
const opt = <T>(value: T | null | undefined) => value ?? undefined;

function pieceTest(rule: PieceRuleData): PieceTest {
  const test: PieceTest = {};
  for (const bound of PIECE_BOUNDS) {
    const value = rule[bound];
    if (typeof value === "number") {
      test[bound] = value;
    }
  }
  if (rule.meshIncludes) {
    test.meshIncludes = rule.meshIncludes;
  }
  return test;
}

/**
 * Sanity's product → the Product the viewer renders, or null when it can't
 * show a model yet (no GLB or no starting camera shot).
 *
 * Ids, URLs and every number are stega-cleaned: in Presentation, strings
 * carry invisible edit markers, which would break id matching, the model URL
 * and the three.js maths. Visible copy keeps them so it stays click-to-edit.
 */
export function toProduct(data: Product3dData): Product | null {
  const modelUrl = stegaClean(data.modelUrl);
  const overviewPose = stegaClean(data.overviewPose);
  if (!(modelUrl && overviewPose)) {
    return null;
  }

  const explode = stegaClean(data.explode);
  const parts = (explode?.parts ?? []).filter(
    (part): part is typeof part & { id: string } => Boolean(part.id)
  );

  return {
    slug: stegaClean(data.slug) ?? "",
    name: data.name ?? "",
    category: data.category ?? "",
    modelUrl,
    modelNote: opt(data.modelNote),
    chromeFixes: stegaClean(data.chromeFixes)?.flatMap((fix) =>
      fix.mesh && typeof fix.minHeight === "number"
        ? [{ mesh: fix.mesh, minHeight: fix.minHeight }]
        : []
    ),
    overviewPose: pose(overviewPose),
    hotspots: data.hotspots?.flatMap((hotspot) => {
      const anchor = stegaClean(hotspot.anchor);
      const normal = stegaClean(hotspot.normal);
      const shot = stegaClean(hotspot.pose);
      const id = stegaClean(hotspot.id);
      if (!(id && anchor && normal && shot)) {
        return [];
      }
      return [
        {
          id,
          label: hotspot.label ?? "",
          title: hotspot.title ?? "",
          body: hotspot.body ?? "",
          specs: hotspot.specs ?? [],
          anchor: vec3(anchor),
          normal: vec3(normal),
          pose: pose(shot),
        },
      ];
    }),
    explode:
      parts.length > 0 && explode?.assembledPose
        ? {
            fallback: explode.fallback ?? parts[0]?.id ?? "",
            order: explode.order ?? parts.map((part) => part.id),
            gap: explode.gap ?? 0.05,
            closing: explode.closing ?? "",
            assembledPose: pose(explode.assembledPose),
            parts: parts.map((part) => ({
              id: part.id,
              label: part.label ?? "",
              spec: opt(part.spec),
              description: part.description ?? "",
              detail: part.detail ?? "",
              specs: part.specs ?? [],
              any: (part.rules ?? []).map(pieceTest),
              delay: part.delay ?? 0,
            })),
          }
        : undefined,
  };
}
