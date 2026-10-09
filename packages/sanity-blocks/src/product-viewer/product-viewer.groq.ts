import { product3dFields } from "./product-3d.groq";

export const productViewerGroqProjection = /* groq */ `
  _type == "productViewer" => {
    ...,
    "product": product->{
      _id,
      description,
      ${product3dFields}
    }
  }
`;
