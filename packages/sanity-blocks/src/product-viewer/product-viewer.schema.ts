import { Rotate3d } from "lucide-react";
import { defineField, defineType } from "sanity";

export const productViewerSchema = defineType({
  name: "productViewer",
  type: "object",
  title: "Product 3D viewer",
  icon: Rotate3d,
  description:
    "A product's interactive 3D model: drag to rotate, numbered hotspots, the exploded view and a fullscreen button.",
  fields: [
    defineField({
      name: "eyebrow",
      type: "string",
      title: "Eyebrow",
      description:
        "The smaller text that sits above the title to provide context",
    }),
    defineField({
      name: "title",
      type: "string",
      title: "Title",
      description:
        "Heading above the viewer. Leave empty to use the product's name.",
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 2,
      title: "Description",
      description:
        "A sentence under the heading. Leave empty to use the product's summary.",
    }),
    defineField({
      name: "product",
      type: "reference",
      title: "Product",
      description:
        "The product whose 3D model to show. It needs a 3D model and a starting camera shot on its 3D tab.",
      to: [{ type: "product" }],
      options: { disableNew: true },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "title", productName: "product.title" },
    prepare: ({ title, productName }) => ({
      title: title || productName || "Product 3D viewer",
      subtitle: productName ? `3D viewer · ${productName}` : "3D viewer",
    }),
  },
});
