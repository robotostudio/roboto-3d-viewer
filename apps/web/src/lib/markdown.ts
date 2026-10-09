import { env } from "@workspace/env/client";
import { urlFor } from "@workspace/sanity/client";
import type {
  QueryAllBlogDataForSearchResult,
  QueryBlogSlugPageDataResult,
  QueryProductIndexResult,
  QueryProductPageDataResult,
} from "@workspace/sanity/types";
import {
  imageToMarkdown,
  type MarkdownBlock,
  pageBuilderToMarkdown,
} from "@workspace/sanity-blocks/internal/page-builder-to-markdown";
import {
  absolutizeUrl,
  escapeMarkdown,
  type MarkdownImage,
  type MarkdownOptions,
  type PortableTextValue,
  portableTextToMarkdown,
} from "@workspace/sanity-blocks/internal/portable-text-to-markdown";

import { PRODUCTS_COPY } from "./site-copy";

// Site origin for absolutizing internal `.md`/page links (already protocol-prefixed).
const BASE_URL = env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

/** Resolves a Sanity image (by asset `_ref`) to a public CDN URL for Markdown. */
export const resolveImageUrl: NonNullable<
  MarkdownOptions["resolveImageUrl"]
> = (image) => {
  if (!image?.id) {
    return null;
  }
  try {
    // The image-url builder accepts an asset reference id (e.g. `image-…`).
    return urlFor(image.id).width(1600).url();
  } catch {
    return null;
  }
};

const markdownOptions: MarkdownOptions = { resolveImageUrl, baseUrl: BASE_URL };

// Field shapes are derived from the generated query result types rather than
// hand-written, per the project's types strategy. The blog post result carries
// every field the serializers read, so it is the source for the document shape.
export type MarkdownDocument = Partial<
  Pick<
    NonNullable<QueryBlogSlugPageDataResult>,
    "title" | "description" | "image" | "richText" | "pageBuilder"
  >
>;

export type MarkdownBlogListItem = Partial<
  Pick<
    NonNullable<QueryAllBlogDataForSearchResult[number]>,
    "title" | "slug" | "orderRank"
  >
>;

function pageBuilderMarkdown(doc: MarkdownDocument): string {
  return pageBuilderToMarkdown(
    doc.pageBuilder as MarkdownBlock[] | null | undefined,
    markdownOptions
  );
}

function richTextMarkdown(richText: MarkdownDocument["richText"]): string {
  return portableTextToMarkdown(richText as PortableTextValue, markdownOptions);
}

function documentHeader(doc: MarkdownDocument): string {
  const title = doc.title?.trim();
  const description = doc.description?.trim();
  return [
    title ? `# ${escapeMarkdown(title)}` : "",
    description ? escapeMarkdown(description) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function withTrailingNewline(sections: string[]): string {
  const body = sections.filter((section) => section.trim()).join("\n\n");
  return body ? `${body}\n` : "";
}

export function pageToMarkdown(doc: MarkdownDocument): string {
  return withTrailingNewline([documentHeader(doc), pageBuilderMarkdown(doc)]);
}

export function blogPostToMarkdown(doc: MarkdownDocument): string {
  const cover = imageToMarkdown(
    doc.image as MarkdownImage | null,
    markdownOptions
  );

  return withTrailingNewline([
    documentHeader(doc),
    cover,
    richTextMarkdown(doc.richText),
    pageBuilderMarkdown(doc),
  ]);
}

export function blogIndexToMarkdown(
  doc: MarkdownDocument,
  posts: MarkdownBlogListItem[]
): string {
  const list = [...posts]
    .sort((a, b) => (a.orderRank ?? "").localeCompare(b.orderRank ?? ""))
    .map((post) => {
      const title = post.title?.trim();
      const slug = post.slug?.trim();
      return title && slug
        ? `- [${escapeMarkdown(title)}](${absolutizeUrl(slug, BASE_URL)})`
        : null;
    })
    .filter(Boolean)
    .join("\n");

  return withTrailingNewline([
    documentHeader(doc),
    pageBuilderMarkdown(doc),
    list ? `## Latest posts\n\n${list}` : "",
  ]);
}

// --- Products -----------------------------------------------------------

export type MarkdownProductCard = Partial<
  Pick<
    QueryProductIndexResult[number],
    "title" | "category" | "description" | "slug"
  >
>;

export type MarkdownProduct = Partial<
  Pick<
    NonNullable<QueryProductPageDataResult>,
    | "name"
    | "category"
    | "description"
    | "keyFacts"
    | "details"
    | "specs"
    | "dimensions"
    | "hotspots"
    | "faqs"
    | "pageBuilder"
  >
>;

const clean = (text?: string | null) => text?.trim().replace(/\s+/g, " ") ?? "";

function section(heading: string, body: string): string {
  return body.trim() ? `## ${heading}\n\n${body}` : "";
}

function list(items: (string | null | undefined)[]): string {
  return items
    .filter((item): item is string => Boolean(item))
    .map((item) => `- ${item}`)
    .join("\n");
}

/** Multi-line spec values as one table cell. */
const cellValue = (text?: string | null) =>
  (text ?? "")
    .split(/\n+/)
    .map((line) => clean(line))
    .filter(Boolean)
    .join("; ");

function table(
  heading: string,
  rows: { label?: string | null; value?: string | null }[] | null | undefined
): string {
  const body = (rows ?? [])
    .filter((row) => clean(row.label) && clean(row.value))
    .map(
      (row) =>
        `| ${escapeMarkdown(clean(row.label))} | ${escapeMarkdown(cellValue(row.value))} |`
    );
  return body.length
    ? [`| ${heading} | Value |`, "| --- | --- |", ...body].join("\n")
    : "";
}

export function productIndexToMarkdown(products: MarkdownProductCard[]) {
  const entries = products
    .filter((product) => clean(product.title) && product.slug)
    .map((product) =>
      [
        `## [${escapeMarkdown(clean(product.title))}](${absolutizeUrl(product.slug, BASE_URL)})`,
        clean(product.category)
          ? `*${escapeMarkdown(clean(product.category))}*`
          : "",
        clean(product.description)
          ? escapeMarkdown(clean(product.description))
          : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    );
  return withTrailingNewline([
    `# ${PRODUCTS_COPY.title}`,
    PRODUCTS_COPY.intro,
    ...entries,
  ]);
}

/** A product page in the order it reads on screen. */
export function productToMarkdown(product: MarkdownProduct): string {
  const name = clean(product.name);
  const keyFacts = list(
    (product.keyFacts ?? []).map((fact) =>
      clean(fact.label) && clean(fact.value)
        ? `**${escapeMarkdown(clean(fact.label))}:** ${escapeMarkdown(clean(fact.value))}`
        : null
    )
  );
  const details = (product.details ?? [])
    .map((paragraph) => clean(paragraph))
    .filter(Boolean)
    .map(escapeMarkdown)
    .join("\n\n");
  const highlights = list(
    (product.hotspots ?? []).map((hotspot) =>
      clean(hotspot.title)
        ? `**${escapeMarkdown(clean(hotspot.title).replace(/\.$/, ""))}.** ${escapeMarkdown(clean(hotspot.body))}`.trim()
        : null
    )
  );
  const faqs = (product.faqs ?? [])
    .filter((faq) => clean(faq.question) && clean(faq.answer))
    .map(
      (faq) =>
        `### ${escapeMarkdown(clean(faq.question))}\n\n${escapeMarkdown(clean(faq.answer))}`
    )
    .join("\n\n");

  return withTrailingNewline([
    name ? `# ${escapeMarkdown(name)}` : "",
    clean(product.category)
      ? `*${escapeMarkdown(clean(product.category))}*`
      : "",
    clean(product.description)
      ? escapeMarkdown(clean(product.description))
      : "",
    section("Key facts", keyFacts),
    section("Product details", details),
    section("Technical specifications", table("Specification", product.specs)),
    section("Dimensions", table("Dimension", product.dimensions)),
    section("Interactive 3D highlights", highlights),
    section("FAQs", faqs),
    pageBuilderMarkdown(product as MarkdownDocument),
  ]);
}
