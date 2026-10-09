"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

import { CloseIcon } from "./icons";
import type { Product } from "./types";

// three.js and the explorer only load once someone opens the viewer.
const ProductExplorer = dynamic(
  () =>
    import("./explorer/product-explorer").then(
      (module) => module.ProductExplorer
    ),
  { ssr: false }
);

type Props = {
  product: Product;
  open: boolean;
  onClose: () => void;
};

/**
 * Fullscreen 3D viewer over the product page: the Explore viewer in a native
 * modal <dialog>. The top layer covers the nav pill with no z-index work, and
 * the browser handles the focus trap, Esc and the inert page behind it. The
 * explorer mounts only while open, so closing disposes the WebGL scene.
 */
export function ViewerDialog({ product, open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // The page behind shouldn't scroll while the viewer is up.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${product.name} in 3D`}
      // Esc (when no hotspot is open) and the close button both end here.
      onClose={onClose}
      className="m-0 h-dvh max-h-none w-dvw max-w-none bg-background p-0 text-foreground backdrop:bg-foreground/40"
    >
      {open && (
        <div className="relative size-full">
          <ProductExplorer product={product} variant="dialog" />
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close 3D viewer"
            // Above the explorer's loader (z-50) so it can always be closed.
            // Centred in the explorer's header bar (h-16 / md:h-20).
            className="focus-ring absolute top-3 right-5 z-[60] grid size-10 place-items-center bg-background ring-1 ring-border transition-colors duration-(--duration-fast) hover:bg-foreground hover:text-background md:top-5 md:right-10"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      )}
    </dialog>
  );
}
