import { cn } from "@workspace/tailwind-config/utils";
import { stegaClean } from "next-sanity";
import type { RefObject } from "react";

import type { Hotspot } from "../types";

type Props = {
  hotspots: Hotspot[];
  /** One slot per hotspot; ProductExplorer writes positions straight to them. */
  buttonRefs: RefObject<(HTMLButtonElement | null)[]>;
  hidden: boolean;
  onSelect: (index: number) => void;
};

/**
 * Numbered markers pinned to the model. Their position is never React state:
 * the scene's render callback writes `transform` and `data-facing` directly,
 * so the markers move in the same frame as the model with no re-render.
 */
export function HotspotLayer({
  hotspots,
  buttonRefs,
  hidden,
  onSelect,
}: Props) {
  return (
    <div
      data-intro-follow
      className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-(--duration-base) ease-out-quad",
        hidden && "opacity-0"
      )}
      aria-hidden={hidden}
    >
      {hotspots.map((hotspot, index) => {
        // Plain text, no stega: these buttons are repositioned every frame,
        // and in Studio's Presentation preview each change makes the
        // visual-editing overlay re-read any Sanity text inside them, which
        // loops until React gives up ("Maximum update depth exceeded").
        // Click-to-edit stays on the info panel, which doesn't move.
        const label = stegaClean(hotspot.label);
        return (
          <button
            key={hotspot.id}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            onClick={() => onSelect(index)}
            tabIndex={hidden ? -1 : 0}
            aria-label={`${label}: show details`}
            // Parked off-screen until the first render positions it.
            style={{ transform: "translate3d(-200px, -200px, 0)" }}
            className={cn(
              "group pointer-events-auto absolute top-0 left-0 -mt-5 -ml-5 grid size-10 place-items-center outline-none",
              "transition-opacity duration-(--duration-fast) ease-out-quad",
              "data-[facing=false]:pointer-events-none data-[facing=false]:opacity-0",
              hidden && "pointer-events-none!"
            )}
          >
            {/* Ripple: a thin ring breathing outward from the marker. */}
            <span
              aria-hidden="true"
              className="hotspot-pulse absolute inset-1.5 rounded-full bg-foreground/25"
            />
            {/* The marker: a solid dot with its number, ringed in the page
              colour so it reads on any part of the model. Scale on this inner
              child, not the button, so the hover target never moves out from
              under the cursor. */}
            <span
              aria-hidden="true"
              className="relative grid size-7 place-items-center rounded-full bg-foreground font-mono text-[11px] text-background tabular-nums ring-2 ring-background transition-transform duration-(--duration-fast) ease-out-quad group-hover:scale-110 group-focus-visible:scale-110 group-focus-visible:outline-2 group-focus-visible:outline-foreground group-focus-visible:outline-offset-2 group-active:scale-95"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="pointer-events-none absolute left-full ml-1.5 whitespace-nowrap bg-foreground px-2.5 py-1 text-background text-sm leading-5 opacity-0 transition-opacity duration-(--duration-fast) ease-out-quad group-hover:opacity-100 group-focus-visible:opacity-100">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
