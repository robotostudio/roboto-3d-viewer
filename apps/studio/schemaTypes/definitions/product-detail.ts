import { defineField, defineType } from "sanity";

// Object types for a product's detail page. Leave a list empty and its
// section is hidden.

export const labelValue = defineType({
  name: "labelValue",
  title: "Label and value",
  type: "object",
  description: "One row of a spec table.",
  fields: [
    defineField({
      name: "label",
      type: "string",
      description: "What's measured, e.g. 'Payload'.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "value",
      type: "text",
      rows: 2,
      description: "The published figure. A new line here breaks the line.",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: { select: { title: "label", subtitle: "value" } },
});

export const productFaq = defineType({
  name: "productFaq",
  title: "FAQ",
  type: "object",
  description: "A question and answer shown on the product page.",
  fields: [
    defineField({
      name: "question",
      type: "string",
      description: "The question as a customer would ask it.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "answer",
      type: "text",
      rows: 4,
      description: "A short, sourced answer.",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: { select: { title: "question", subtitle: "answer" } },
});

export const productDetailDefinitions = [labelValue, productFaq];
