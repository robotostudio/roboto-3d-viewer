/**
 * Everything the 3D viewer needs from a `product` document, shaped for
 * `toProduct` in @workspace/product-3d/map-product. Shared by the
 * productViewer block and the /products/[slug] page query.
 */
const vec3Fields = /* groq */ `{ x, y, z }`;
const poseFields = /* groq */ `{
  "camera": camera${vec3Fields},
  "target": target${vec3Fields},
  frameOffset
}`;

export const product3dFields = /* groq */ `
  "name": title,
  "slug": slug.current,
  category,
  "modelUrl": model->model.asset->url,
  modelNote,
  "overviewPose": overviewPose${poseFields},
  hotspots[]{
    id,
    label,
    title,
    body,
    specs,
    "anchor": anchor${vec3Fields},
    "normal": normal${vec3Fields},
    "pose": pose${poseFields}
  },
  explode{
    fallback,
    order,
    gap,
    closing,
    "assembledPose": assembledPose${poseFields},
    parts[]{
      id,
      label,
      spec,
      description,
      detail,
      specs,
      delay,
      rules[]{ xMin, xMax, yMin, yMax, zMin, zMax, meshIncludes }
    }
  },
  chromeFixes[]{ mesh, minHeight }
`;
