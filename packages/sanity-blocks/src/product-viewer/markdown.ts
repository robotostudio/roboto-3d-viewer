import {
  eyebrowToMarkdown,
  headingToMarkdown,
  joinSections,
  type MarkdownBlock,
} from "../internal/markdown";
import { escapeMarkdown } from "../internal/portable-text-to-markdown";

type ProductViewerMarkdownBlock = MarkdownBlock & {
  product?: {
    name?: string | null;
    description?: string | null;
    hotspots?: { title?: string | null; body?: string | null }[] | null;
  } | null;
};

const clean = (text?: string | null) => text?.trim().replace(/\s+/g, " ") ?? "";

/**
 * The viewer is interactive-only, so its Markdown twin is the text it
 * reveals: heading, summary, and each hotspot's title and explanation.
 */
export function productViewerToMarkdown(
  block: ProductViewerMarkdownBlock
): string {
  const product = block.product;
  const summary = clean(block.description ?? product?.description);
  const hotspots = (product?.hotspots ?? [])
    .filter((hotspot) => clean(hotspot.title))
    .map((hotspot) => {
      const body = clean(hotspot.body);
      return `- **${escapeMarkdown(clean(hotspot.title))}**${body ? ` ${escapeMarkdown(body)}` : ""}`;
    })
    .join("\n");

  return joinSections([
    eyebrowToMarkdown(block.eyebrow),
    headingToMarkdown(block.title ?? product?.name, 2),
    summary ? escapeMarkdown(summary) : "",
    hotspots,
  ]);
}
