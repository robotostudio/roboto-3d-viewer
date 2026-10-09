/**
 * Shared motion vocabulary, ported from the random-inspration lab.
 *
 * These mirror the `--ease-*` and `--duration-*` custom properties in
 * app/globals.css. If you change a curve here, change it there too.
 */

/** Cubic-bezier control points. */
export const easing = {
  /** Gentle ease-out. Button presses, small state changes. */
  outQuad: [0.25, 0.46, 0.45, 0.94],
  /** Strong ease-out. The default for entrances, reveals, hovers. */
  outExpo: [0.19, 1, 0.22, 1],
  /** Symmetric. For things already on screen moving from A to B. */
  inOutCubic: [0.645, 0.045, 0.355, 1],
} as const;

/** Seconds, for GSAP (it takes seconds, not ms). */
export const duration = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const;

/** GSAP names its curves as strings; these are the same curves. */
export const gsapEase = {
  outQuad: "power2.out",
  outExpo: "expo.out",
  inOutCubic: "power3.inOut",
} as const;
