/**
 * Copy for the code-owned /products index, shared by the page and its
 * Markdown twin so the two never drift apart.
 */
export const PRODUCTS_COPY = {
  title: "Robots",
  intro:
    "A small fleet of robots, each with an interactive 3D model. Rotate them, open the hotspots, and pull them apart in the exploded view.",
} as const;

/** Copy for the /contact page (demo: the forms work but send nothing). */
export const CONTACT_COPY = {
  eyebrow: "Contact",
  title: "Talk to us about Cobot C6",
  intro:
    "Schedule a demo, ask for a quote or ask a question. This is a Roboto Studio demo, so the form works but nothing is sent.",
  links: [
    {
      label: "Who built this",
      text: "Roboto Studio",
      url: "https://robotostudio.com",
    },
    {
      label: "The code",
      text: "github.com/robotostudio/roboto-3d-viewer",
      url: "https://github.com/robotostudio/roboto-3d-viewer",
    },
    {
      label: "The editor",
      text: "Sanity Studio",
      url: "https://roboto-3d-viewer.sanity.studio",
    },
  ],
} as const;
