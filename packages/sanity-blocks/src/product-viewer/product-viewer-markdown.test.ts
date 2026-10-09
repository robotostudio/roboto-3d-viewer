import { productViewerToMarkdown } from "./markdown";

test("productViewerToMarkdown returns empty string for an empty block", () => {
  expect(productViewerToMarkdown({})).toBe("");
});

test("productViewerToMarkdown falls back to the product's name and summary", () => {
  const result = productViewerToMarkdown({
    product: {
      name: "Arm A6",
      description: "A six-axis robot arm.",
    },
  });
  expect(result).toBe("## Arm A6\n\nA six-axis robot arm.");
});

test("productViewerToMarkdown prefers the block's own title and description", () => {
  const result = productViewerToMarkdown({
    eyebrow: "In 3D",
    title: "Explore it",
    description: "Drag to rotate.",
    product: { name: "Arm A6", description: "Ignored." },
  });
  expect(result).toBe("**In 3D**\n\n## Explore it\n\nDrag to rotate.");
});

test("productViewerToMarkdown lists hotspot titles with their text", () => {
  const result = productViewerToMarkdown({
    title: "TRC",
    product: {
      hotspots: [
        { title: "Two sensors.", body: "Colour and monochrome." },
        { title: "", body: "Skipped without a title." },
        { title: "Settings in a tap.", body: null },
      ],
    },
  });
  expect(result).toContain("- **Two sensors.** Colour and monochrome.");
  expect(result).toContain("- **Settings in a tap.**");
  expect(result).not.toContain("Skipped");
});

test("productViewerToMarkdown emits no HTML or JSX tags", () => {
  const result = productViewerToMarkdown({
    title: "T",
    product: { hotspots: [{ title: "A", body: "B" }] },
  });
  expect(result).not.toMatch(/<[A-Za-z]/);
});
