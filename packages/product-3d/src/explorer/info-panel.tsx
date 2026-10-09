import { cn } from "@workspace/tailwind-config/utils";
import { Button } from "@workspace/ui/components/button";
import type { RefObject } from "react";

import { CloseIcon } from "../icons";
import type { Hotspot } from "../types";

type Props = {
  ref: RefObject<HTMLDivElement | null>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Anything with a label, title, body and spec chips. */
  hotspot: Pick<Hotspot, "label" | "title" | "body" | "specs">;
  index: number;
  count: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
};

const MONO = "font-mono text-xs uppercase leading-4 tracking-[0.24px]";

/**
 * Details for the open hotspot: a panel on the right on wide screens, a
 * bottom sheet on narrow ones. Entry and exit are animated by the explorer;
 * children marked `data-panel-item` stagger in.
 */
export function InfoPanel({
  ref,
  headingRef,
  hotspot,
  index,
  count,
  onPrevious,
  onNext,
  onClose,
}: Props) {
  const position = (value: number) => String(value).padStart(2, "0");

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:flex md:items-center md:p-8">
      <section
        aria-labelledby="hotspot-title"
        aria-modal="false"
        className="pointer-events-auto max-h-[52svh] overflow-y-auto bg-background p-6 shadow-[0_24px_64px_-24px_rgb(0_0_0/0.35)] ring-1 ring-border md:max-h-none md:w-[400px] md:p-8"
        ref={ref}
        role="dialog"
      >
        <div className="flex items-center justify-between" data-panel-item>
          <p className={cn(MONO, "text-muted-foreground tabular-nums")}>
            {hotspot.label}
            <span className="mx-2 opacity-50">·</span>
            {position(index + 1)}/{position(count)}
          </p>
          <button
            aria-label="Close details"
            className="focus-ring -mr-2 grid size-9 place-items-center text-muted-foreground transition-colors duration-150 hover:bg-card hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        <h2
          className="mt-4 text-balance font-normal text-3xl leading-tight tracking-[-0.03em] outline-none"
          data-panel-item
          id="hotspot-title"
          ref={headingRef}
          tabIndex={-1}
        >
          {hotspot.title}
        </h2>
        <p
          className="mt-3 text-pretty text-base text-muted-foreground leading-7"
          data-panel-item
        >
          {hotspot.body}
        </p>

        {hotspot.specs.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2" data-panel-item>
            {hotspot.specs.map((spec) => (
              <li className="bg-card px-3 py-1.5 text-sm leading-5" key={spec}>
                {spec}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 grid grid-cols-2 gap-3" data-panel-item>
          <Button onClick={onPrevious} size="sm" variant="outline">
            Previous
          </Button>
          <Button onClick={onNext} size="sm">
            Next
          </Button>
        </div>
      </section>
    </div>
  );
}
