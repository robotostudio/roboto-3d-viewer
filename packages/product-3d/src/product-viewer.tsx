"use client";

import { cn } from "@workspace/tailwind-config/utils";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { View3dIcon } from "./icons";
import { LABEL } from "./styles";
import type { Product } from "./types";
import { ViewerDialog } from "./viewer-dialog";

// three.js and the explorer load only once the viewer nears the viewport.
const ProductExplorer = dynamic(
  () =>
    import("./explorer/product-explorer").then(
      (module) => module.ProductExplorer
    ),
  { ssr: false }
);

/** Start loading this far before the box scrolls into view. */
const PRELOAD_MARGIN = "400px 0px";

type Props = {
  product: Product;
  className?: string;
};

/**
 * The 3D explorer in a box on the page, with a button that opens it
 * fullscreen. Mounts only when the box is about to scroll into view, so a
 * page with a viewer far down stays light until it's needed.
 */
export function ProductViewer({ product, className }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const [nearView, setNearView] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || nearView) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearView(true);
          observer.disconnect();
        }
      },
      { rootMargin: PRELOAD_MARGIN }
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, [nearView]);

  return (
    <div
      ref={boxRef}
      className={cn(
        "relative aspect-4/5 w-full overflow-hidden bg-card sm:aspect-16/10",
        className
      )}
    >
      {/* The inline scene pauses while the fullscreen copy is open, so only
          one WebGL context renders at a time. */}
      {nearView && !fullscreen && (
        <ProductExplorer product={product} variant="inline" />
      )}

      <button
        ref={openButtonRef}
        type="button"
        onClick={() => setFullscreen(true)}
        className={cn(
          LABEL,
          // Above the explorer's loader (z-50) so it's usable while loading.
          "absolute top-3 right-3 z-[60] flex h-10 items-center gap-2 bg-background px-3 ring-1 ring-border transition-colors duration-(--duration-fast) hover:bg-foreground hover:text-background md:top-5 md:right-5"
        )}
      >
        <View3dIcon className="size-4" />
        Fullscreen
      </button>

      <ViewerDialog
        product={product}
        open={fullscreen}
        onClose={() => {
          setFullscreen(false);
          openButtonRef.current?.focus({ preventScroll: true });
        }}
      />
    </div>
  );
}
