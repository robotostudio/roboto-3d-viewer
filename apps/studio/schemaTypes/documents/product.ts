import { LayoutList, Rotate3d } from "lucide-react";
import { defineArrayMember, defineField, defineType } from "sanity";

import { HotspotsInput } from "@/components/model-picker/hotspots-input";
import { documentSlugField, pageBuilderField } from "@/schemaTypes/common";
import { GROUP, GROUPS } from "@/utils/constant";
import { ogFields } from "@/utils/og-fields";
import { seoFields } from "@/utils/seo-fields";

const MODEL_GROUP = "model";
const DETAIL_GROUP = "detail";

/**
 * A product with an interactive 3D model. It gets its own page at
 * /products/<slug>: a gallery hero that opens the 3D viewer, details, then any
 * page-builder blocks. The same viewer can be
 * placed on other pages with the "Product 3D viewer" block.
 */
export const product = defineType({
  name: "product",
  type: "document",
  title: "Product",
  description:
    "A product with an interactive 3D viewer and its own page under /products.",
  icon: Rotate3d,
  groups: [
    ...GROUPS,
    { name: DETAIL_GROUP, title: "Product page", icon: LayoutList },
    { name: MODEL_GROUP, title: "3D", icon: Rotate3d },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      title: "Name",
      description: "The product name, e.g. 'Scout R1'.",
      group: GROUP.MAIN_CONTENT,
      validation: (rule) => rule.required(),
    }),
    documentSlugField("product", {
      group: GROUP.MAIN_CONTENT,
      description:
        "The page address, under /products/ (e.g. /products/scout-r1).",
    }),
    defineField({
      name: "category",
      type: "string",
      description:
        "What the product is, in a few words, e.g. 'Autonomous inspection robot'.",
      group: GROUP.MAIN_CONTENT,
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      title: "Summary",
      description:
        "One or two sentences under the name. Also used for search results.",
      group: GROUP.MAIN_CONTENT,
    }),
    pageBuilderField,

    defineField({
      name: "gallery",
      type: "array",
      group: DETAIL_GROUP,
      description:
        "Product photos or renders, first one is the default. Transparent cut-outs look best. Needed for the product to show in the products list.",
      of: [
        defineArrayMember({
          type: "image",
          fields: [
            defineField({
              name: "alt",
              title: "Alt text",
              type: "string",
              description:
                "What the image shows, e.g. 'Scout R1 from the side'.",
              validation: (rule) => rule.required(),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "keyFacts",
      title: "Headline figures",
      type: "array",
      group: DETAIL_GROUP,
      description:
        "Up to three short figures shown beside the gallery, e.g. 'Battery life · 8 h'.",
      of: [defineArrayMember({ type: "labelValue" })],
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: "details",
      title: "Product details",
      type: "array",
      group: DETAIL_GROUP,
      description: "Paragraphs for the Product Details section, one per entry.",
      of: [defineArrayMember({ type: "text", rows: 4 })],
    }),
    defineField({
      name: "specs",
      title: "Technical specifications",
      type: "array",
      group: DETAIL_GROUP,
      description: "The spec table, in order.",
      of: [defineArrayMember({ type: "labelValue" })],
    }),
    defineField({
      name: "dimensions",
      type: "array",
      group: DETAIL_GROUP,
      description: "Size and weight rows.",
      of: [defineArrayMember({ type: "labelValue" })],
    }),
    defineField({
      name: "faqs",
      title: "FAQs",
      type: "array",
      group: DETAIL_GROUP,
      description: "Only published questions; leave empty to hide the section.",
      of: [defineArrayMember({ type: "productFaq" })],
    }),
    defineField({
      name: "related",
      title: "Related products",
      type: "array",
      group: DETAIL_GROUP,
      description: "Other products to suggest at the bottom of the page.",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "product" }],
          options: { disableNew: true },
        }),
      ],
    }),

    defineField({
      name: "model",
      title: "3D model",
      type: "reference",
      to: [{ type: "productModel" }],
      group: MODEL_GROUP,
      description: "Upload the GLB under '3D models', then pick it here.",
    }),
    defineField({
      name: "modelNote",
      title: "Viewer note",
      type: "string",
      group: MODEL_GROUP,
      description:
        "Small note in the viewer, e.g. that the model is a stand-in.",
    }),
    defineField({
      name: "overviewPose",
      title: "Starting camera shot",
      type: "cameraPose",
      group: MODEL_GROUP,
      description:
        "The view the viewer opens on. Orbit the model, then “Use this view”.",
    }),
    defineField({
      name: "hotspots",
      type: "array",
      group: MODEL_GROUP,
      description:
        "Click “Add hotspot”, then click the model. Select a numbered dot to move it or set the angle it opens with.",
      components: { input: HotspotsInput },
      of: [defineArrayMember({ type: "modelHotspot" })],
    }),
    defineField({
      name: "explode",
      type: "explodeConfig",
      group: MODEL_GROUP,
    }),
    defineField({
      name: "chromeFixes",
      title: "Chrome fixes",
      type: "array",
      group: MODEL_GROUP,
      description:
        "Only for models whose shared textures make a part render wrongly.",
      of: [defineArrayMember({ type: "chromeFix" })],
    }),
    ...seoFields.filter((field) => field.name !== "seoHideFromLists"),
    ...ogFields,
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "category",
      hasModel: "model._ref",
      media: "gallery.0",
    },
    prepare: ({ title, subtitle, hasModel, media }) => ({
      title: title || "Untitled product",
      media,
      subtitle: `${hasModel ? "3D" : "No model"}${subtitle ? ` · ${subtitle}` : ""}`,
    }),
  },
});
