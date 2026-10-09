import { defineArrayMember, defineField, defineType } from "sanity";

import { CameraPoseInput } from "@/components/model-picker/camera-pose-input";

// Object types for a product's 3D viewer. Positions and camera shots are set
// on the model itself in Studio (components/model-picker); the numbers they
// store are metres in the model's space, +Y up, origin at the base centre.

export const vec3 = defineType({
  name: "vec3",
  title: "Point (x, y, z)",
  type: "object",
  description: "A position in the model's space, in metres.",
  options: { columns: 3 },
  fields: [
    defineField({
      name: "x",
      type: "number",
      description: "Left (−) to right (+).",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "y",
      type: "number",
      description: "Down (−) to up (+); 0 is the floor.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "z",
      type: "number",
      description: "Back (−) to front (+).",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { x: "x", y: "y", z: "z" },
    prepare: ({ x, y, z }) => ({ title: `${x}, ${y}, ${z}` }),
  },
});

export const cameraPose = defineType({
  name: "cameraPose",
  title: "Camera shot",
  type: "object",
  description:
    "Orbit the model to the angle you want, then press “Use this view”.",
  components: { input: CameraPoseInput },
  fields: [
    defineField({
      name: "camera",
      type: "vec3",
      description: "Where the camera stands.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "target",
      type: "vec3",
      description: "The point the camera looks at and orbits around.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "frameOffset",
      title: "Frame offset",
      type: "number",
      description:
        "Wide screens only: pushes the model sideways as a fraction of the viewport width (+ right, − left). 0 centres it.",
      initialValue: 0,
    }),
  ],
});

export const modelHotspot = defineType({
  name: "modelHotspot",
  title: "Hotspot",
  type: "object",
  description: "A numbered point on the model that opens a short explanation.",
  fieldsets: [
    {
      name: "placement",
      title: "Position on the model",
      description:
        "Set on the 3D model above: “Move point” and “Use this view”.",
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: "label",
      type: "string",
      description: "Short name in the list and next to the dot.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      type: "string",
      description: "Heading of the panel that opens.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      type: "text",
      rows: 4,
      description: "One or two sentences, from the official product page.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "specs",
      type: "array",
      description: "Short published figures shown as chips, e.g. '50° / 35°'.",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
    defineField({
      name: "id",
      title: "ID",
      type: "string",
      description: "Set automatically when the hotspot is added.",
      fieldset: "placement",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "anchor",
      title: "Point",
      type: "vec3",
      description: "Where the dot sits on the model.",
      fieldset: "placement",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "normal",
      title: "Surface direction",
      type: "vec3",
      description:
        "Which way the surface faces; the dot hides when it's around the back.",
      fieldset: "placement",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "pose",
      title: "Camera shot when open",
      type: "cameraPose",
      description: "The angle the camera flies to when this hotspot opens.",
      fieldset: "placement",
      readOnly: true,
      // Set from the hotspots view above; one viewer per hotspot would be
      // heavy, so this shows the stored numbers only.
      components: { input: (props) => props.renderDefault(props) },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: { select: { title: "label", subtitle: "title" } },
});

export const pieceTest = defineType({
  name: "pieceTest",
  title: "Rule",
  type: "object",
  description:
    "A piece of the model belongs to the assembly when its centre passes every bound set here (metres). Leave a bound empty to skip it.",
  options: { columns: 2 },
  fields: [
    defineField({
      name: "xMin",
      type: "number",
      description: "Lowest x the piece's centre may have.",
    }),
    defineField({
      name: "xMax",
      type: "number",
      description: "Highest x the piece's centre may have.",
    }),
    defineField({
      name: "yMin",
      type: "number",
      description: "Lowest y the piece's centre may have.",
    }),
    defineField({
      name: "yMax",
      type: "number",
      description: "Highest y the piece's centre may have.",
    }),
    defineField({
      name: "zMin",
      type: "number",
      description: "Lowest z the piece's centre may have.",
    }),
    defineField({
      name: "zMax",
      type: "number",
      description: "Highest z the piece's centre may have.",
    }),
    defineField({
      name: "meshIncludes",
      title: "Mesh name contains",
      type: "string",
      description:
        "Match by name instead, e.g. '-split' for pieces made by a chrome fix.",
    }),
  ],
  preview: {
    select: {
      xMin: "xMin",
      xMax: "xMax",
      yMin: "yMin",
      yMax: "yMax",
      zMin: "zMin",
      zMax: "zMax",
      mesh: "meshIncludes",
    },
    prepare: (bounds) => ({
      title:
        Object.entries(bounds)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => `${key} ${value}`)
          .join(" · ") || "Any piece",
    }),
  },
});

export const explodePart = defineType({
  name: "explodePart",
  title: "Assembly",
  type: "object",
  description: "One functional group of parts in the exploded view.",
  fields: [
    defineField({
      name: "id",
      title: "ID",
      type: "string",
      description: "Short code used in 'Order' and 'Fallback', e.g. 'head'.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "label",
      type: "string",
      description: "Name on the part's tag, e.g. 'Optical head'.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "spec",
      type: "string",
      description: "Short headline spec, if one is published.",
    }),
    defineField({
      name: "description",
      type: "string",
      description: "One line about what the assembly does.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "detail",
      type: "text",
      rows: 4,
      description: "Paragraph in the panel when the assembly is selected.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "specs",
      type: "array",
      description: "Published figures shown as chips in the panel.",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
    defineField({
      name: "rules",
      type: "array",
      of: [defineArrayMember({ type: "pieceTest" })],
      description:
        "Which pieces of the model belong here. Any rule matching is enough; rules are checked assembly by assembly, first match wins.",
    }),
    defineField({
      name: "delay",
      type: "number",
      description:
        "0–1: when this assembly starts moving in the explode, for a stagger.",
      initialValue: 0,
      validation: (rule) => rule.min(0).max(1),
    }),
  ],
  preview: { select: { title: "label", subtitle: "id" } },
});

export const explodeConfig = defineType({
  name: "explodeConfig",
  title: "Exploded view",
  type: "object",
  description:
    "How the model splits into assemblies for the viewer's “Exploded view”. Leave empty to hide the button.",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: "parts",
      title: "Assemblies",
      type: "array",
      description: "The groups the model splits into.",
      of: [defineArrayMember({ type: "explodePart" })],
    }),
    defineField({
      name: "order",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
      description:
        "Assembly IDs left to right in the exploded row (top to bottom on phones).",
    }),
    defineField({
      name: "fallback",
      type: "string",
      description: "Assembly ID for pieces no rule claims.",
    }),
    defineField({
      name: "gap",
      type: "number",
      description: "Space between assemblies in the row, metres.",
      initialValue: 0.05,
    }),
    defineField({
      name: "assembledPose",
      title: "Assembled camera shot",
      type: "cameraPose",
      description: "The camera before the model splits apart.",
    }),
    defineField({
      name: "closing",
      type: "string",
      description: "Optional one-line summary, e.g. 'Five assemblies. One …'.",
    }),
  ],
});

export const chromeFix = defineType({
  name: "chromeFix",
  title: "Chrome fix",
  type: "object",
  description:
    "Re-renders pieces of a mesh as polished chrome, for texture faults in the source model.",
  fields: [
    defineField({
      name: "mesh",
      title: "Mesh name",
      type: "string",
      description: "three.js node name (dots removed: 'part.001' → 'part001').",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "minHeight",
      title: "Minimum height (m)",
      type: "number",
      description: "Only connected pieces taller than this are changed.",
      validation: (rule) => rule.required(),
    }),
  ],
});

export const product3dDefinitions = [
  vec3,
  cameraPose,
  modelHotspot,
  pieceTest,
  explodePart,
  explodeConfig,
  chromeFix,
];
