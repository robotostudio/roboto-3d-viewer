"use client";

import { useGSAP } from "@gsap/react";
import { cn } from "@workspace/tailwind-config/utils";
import gsap from "gsap";
import { type RefObject, useRef } from "react";

gsap.registerPlugin(useGSAP);

type Props = {
  ref: RefObject<HTMLDivElement | null>;
  /** 0 → 1 download progress of the model. */
  progress: number;
  /** Loading has settled, successfully or not. */
  complete: boolean;
  failed: boolean;
  /** Called once the mark is fully lit (or loading failed). */
  onFilled: () => void;
  /** Cover the parent box instead of the viewport (e.g. inside a dialog). */
  contained?: boolean;
};

/** The Roboto "R" mark (white) and wordmark (white), on the dark loader. */
const MARK_SRC = "/brand/roboto-r.svg";
const WORDMARK_SRC = "/brand/roboto-wordmark-white.svg";
/** The mark's viewBox is 600 × 544; the fill grows out from its middle. */
const MARK_RATIO = "600 / 544";
const GAP = 50;

/** Seconds the fill takes to catch up with each new progress value. */
const CATCH_UP = 0.6;
/** Seconds for the final fill once the model is ready. */
const FINISH = 0.5;

/** Clip for the lit copy: a band that grows outward from the gap. */
const band = (value: number) =>
  `inset(${GAP * (1 - value)}% 0 ${(100 - GAP) * (1 - value)}% 0)`;

/**
 * Full-page loader: the Roboto mark on a dark screen. A dim ghost of the mark
 * sits underneath and a lit copy is revealed by a band growing out from its
 * middle, driven by real download progress.
 * useIntroReveal then lifts the whole screen away like a curtain.
 *
 * The fill never shows raw progress: a GSAP tween chases it, so it grows
 * smoothly and always completes before the reveal, even for a cached model.
 * It's written through a ref, not React state, so filling doesn't re-render.
 */
export function IntroScreen({
  ref,
  progress,
  complete,
  failed,
  onFilled,
  contained = false,
}: Props) {
  const fillRef = useRef<HTMLImageElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef({ value: 0 });
  const filledRef = useRef(false);

  useGSAP(
    () => {
      if (filledRef.current) return;
      const display = displayRef.current;
      const draw = () => {
        if (fillRef.current)
          fillRef.current.style.clipPath = band(display.value);
        meterRef.current?.setAttribute(
          "aria-valuenow",
          String(Math.round(display.value * 100))
        );
      };
      const finish = () => {
        filledRef.current = true;
        onFilled();
      };

      if (complete && failed) {
        gsap.killTweensOf(display);
        finish();
        return;
      }

      gsap.to(display, {
        value: complete ? 1 : progress,
        // The final fill scales with how much is left, so a cached model
        // still visibly lights up rather than snapping on.
        duration: complete ? FINISH * (1 - display.value) + 0.2 : CATCH_UP,
        ease: complete ? "power2.inOut" : "power2.out",
        overwrite: true,
        onUpdate: draw,
        onComplete: complete ? finish : undefined,
      });
    },
    { dependencies: [progress, complete, failed] }
  );

  return (
    <div
      ref={ref}
      className={cn(
        "intro-screen inset-0 z-50 grid place-items-center",
        contained ? "absolute" : "fixed"
      )}
    >
      <div className="flex flex-col items-center">
        <div
          ref={meterRef}
          data-intro-content
          role="progressbar"
          aria-label={failed ? "3D model unavailable" : "Loading 3D model"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          className="relative w-24 md:w-28"
          style={{ aspectRatio: MARK_RATIO }}
        >
          {/* biome-ignore lint/performance/noImgElement: two stacked, clipped copies of one small SVG; next/image's wrapper and lazy loading fight the stacking and first-paint render. */}
          <img
            src={MARK_SRC}
            alt=""
            draggable={false}
            className="intro-ghost absolute inset-0 size-full select-none"
          />
          {/* biome-ignore lint/performance/noImgElement: see above. */}
          <img
            ref={fillRef}
            src={MARK_SRC}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full select-none"
            style={{ clipPath: band(0) }}
          />
        </div>

        {/* The wordmark under the mark: one soft fade-in (CSS, first paint),
            then still, so the filling mark stays the only thing moving. */}
        {/* biome-ignore lint/performance/noImgElement: small static SVG on the loader; first-paint render matters more than optimisation. */}
        <img
          aria-hidden="true"
          src={WORDMARK_SRC}
          alt=""
          draggable={false}
          className="intro-wordmark mt-7 w-36 select-none md:w-44"
        />
      </div>
    </div>
  );
}
