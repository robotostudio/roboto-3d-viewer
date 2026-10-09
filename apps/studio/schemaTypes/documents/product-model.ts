import { Box } from "lucide-react";
import { defineField, defineType } from "sanity";

export const productModel = defineType({
  name: "productModel",
  type: "document",
  title: "3D model",
  description:
    "A GLB file for a product's interactive 3D viewer. Pick it on the product's 3D tab.",
  icon: Box,
  fields: [
    defineField({
      name: "title",
      type: "string",
      title: "Title",
      description: "The product this model belongs to, e.g. 'Scout R1'.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "model",
      type: "file",
      title: "Model file (.glb)",
      description:
        "Upload an optimised GLB: meshopt geometry and WebP textures, ideally a few MB (gltf-transform optimize). Units in metres, +Y up, origin at the centre of the base.",
      options: { accept: ".glb,model/gltf-binary" },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "title", size: "model.asset.size" },
    prepare: ({ title, size }) => ({
      title: title || "Untitled model",
      subtitle:
        typeof size === "number"
          ? `${(size / 1_000_000).toFixed(1)} MB`
          : "No file",
    }),
  },
});
