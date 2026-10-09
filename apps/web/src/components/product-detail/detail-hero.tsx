"use client";

import { View3dIcon } from "@workspace/product-3d/icons";
import type { Product } from "@workspace/product-3d/types";
import { ViewerDialog } from "@workspace/product-3d/viewer-dialog";
import { SanityImage } from "@workspace/sanity-blocks/internal/sanity-image";
import { cn } from "@workspace/tailwind-config/utils";
import { Button } from "@workspace/ui/components/button";
import { Check, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { useEnquiry } from "@/components/enquiry/enquiry-context";
import { QuantityStepper } from "@/components/enquiry/quantity-stepper";

export type GalleryImage = {
  key: string;
  id: string;
  preview?: string | null;
  alt: string;
};
export type KeyFact = { key: string; label: string; value: string };

type Props = {
  name: string;
  category?: string | null;
  summary?: string | null;
  gallery: GalleryImage[];
  /** A few headline figures from the spec table. */
  keyFacts: KeyFact[];
  /** The 3D viewer's data; without it the 3D buttons hide. */
  viewer: Product | null;
  /** Product slug, for the enquiry line and the contact link. */
  slug: string;
};

const EYEBROW =
  "font-mono text-sm uppercase leading-6 tracking-[0.24px] text-muted-foreground";

/**
 * Product page hero: a large gallery with the "Interactive 3D model" button
 * on the image (it opens the 3D explorer fullscreen), and the name, headline
 * figures, "Request a quote" (the enquiry cart) and "Schedule a demo".
 */
export function DetailHero({
  name,
  category,
  summary,
  gallery,
  keyFacts,
  viewer,
  slug,
}: Readonly<Props>) {
  const rootRef = useRef<HTMLElement>(null);
  const viewerButtonRef = useRef<HTMLButtonElement>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const enquiry = useEnquiry();
  const addedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  const addToEnquiry = () => {
    const cover = gallery[0];
    enquiry.add(
      {
        slug,
        title: name,
        category,
        image: cover
          ? { id: cover.id, preview: cover.preview, alt: cover.alt }
          : null,
      },
      quantity
    );
    enquiry.open();
    setAdded(true);
    window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), 2000);
  };

  const image = gallery[imageIndex];

  // Warm the model once the page is idle, so the viewer's loader is quick.
  useEffect(() => {
    if (!viewer) {
      return;
    }
    const idle =
      window.requestIdleCallback ??
      ((callback: () => void) => window.setTimeout(callback, 800));
    const handle = idle(() => {
      fetch(viewer.modelUrl).catch(() => undefined);
    });
    return () => {
      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
  }, [viewer]);

  // Arrow keys move between thumbnails, like a tab list.
  const onThumbKey = (event: KeyboardEvent, index: number) => {
    let step = 0;
    if (event.key === "ArrowRight") {
      step = 1;
    } else if (event.key === "ArrowLeft") {
      step = -1;
    }
    if (!step) {
      return;
    }
    event.preventDefault();
    const next = (index + step + gallery.length) % gallery.length;
    setImageIndex(next);
    rootRef.current
      ?.querySelectorAll<HTMLButtonElement>("[data-thumb]")
      [next]?.focus();
  };

  return (
    <section
      aria-label={name}
      className="grid items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16"
      ref={rootRef}
    >
      {/* Gallery */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="relative aspect-square w-full overflow-hidden bg-card sm:aspect-[5/4]">
          {image ? (
            // Same loading as the site's hero images: the pixelated preview
            // shows at once, then the full image replaces it.
            <SanityImage
              alt={image.alt}
              className="absolute inset-0 size-full object-contain! p-6 sm:p-10"
              fetchPriority={imageIndex === 0 ? "high" : undefined}
              height={1200}
              image={image}
              key={image.id}
              loading={imageIndex === 0 ? "eager" : "lazy"}
              mode="contain"
              sizes="(min-width: 1024px) 58vw, 100vw"
              width={1200}
            />
          ) : null}
          {viewer ? (
            <Button
              className="absolute bottom-4 left-4 gap-2.5 font-mono text-sm uppercase tracking-[0.24px] sm:bottom-6 sm:left-6"
              onClick={() => setViewerOpen(true)}
              ref={viewerButtonRef}
              size="sm"
            >
              <View3dIcon className="size-5" />
              Interactive 3D model
            </Button>
          ) : null}
        </div>

        {gallery.length > 1 ? (
          <ul
            aria-label="Product images"
            className="grid grid-cols-5 gap-3 sm:grid-cols-6"
          >
            {gallery.map((entry, index) => (
              <li key={entry.key}>
                <button
                  aria-label={`Show image ${index + 1}: ${entry.alt}`}
                  aria-pressed={index === imageIndex}
                  className={cn(
                    "focus-ring relative block aspect-square w-full overflow-hidden bg-card transition-opacity duration-150",
                    index === imageIndex
                      ? "ring-1 ring-foreground"
                      : "opacity-70 hover:opacity-100"
                  )}
                  data-thumb
                  onClick={() => setImageIndex(index)}
                  onKeyDown={(event) => onThumbKey(event, index)}
                  tabIndex={index === imageIndex ? 0 : -1}
                  type="button"
                >
                  <SanityImage
                    alt=""
                    className="absolute inset-0 size-full object-contain! p-1.5"
                    height={240}
                    image={entry}
                    mode="contain"
                    width={240}
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Name, figures and the 3D action */}
      <div className="flex min-w-0 flex-col gap-8 lg:sticky lg:top-24">
        <div className="flex flex-col gap-4">
          {category ? <p className={EYEBROW}>{category}</p> : null}
          <h1 className="font-normal text-5xl text-foreground leading-none tracking-[-0.03em] md:text-6xl">
            {name}
          </h1>
          {summary ? (
            <p className="text-lg text-muted-foreground leading-7">{summary}</p>
          ) : null}
        </div>

        {keyFacts.length > 0 ? (
          <dl className="grid grid-cols-3 border-border border-y">
            {keyFacts.map((fact, index) => (
              <div
                className={cn(
                  "flex flex-col gap-1 py-4",
                  index > 0 && "border-border border-l pl-4"
                )}
                key={fact.key}
              >
                <dt className="font-mono text-muted-foreground text-xs uppercase leading-4 tracking-[0.24px]">
                  {fact.label}
                </dt>
                <dd className="text-base leading-6">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <QuantityStepper
              label={name}
              onChange={setQuantity}
              value={quantity}
            />
            <Button className="flex-1 gap-2" onClick={addToEnquiry}>
              {added ? (
                <Check className="size-4" />
              ) : (
                <ShoppingCart className="size-4" />
              )}
              {added ? "Added to enquiry" : "Request a quote"}
            </Button>
          </div>
          <Button asChild className="w-full" variant="outline">
            <Link href={`/contact?topic=demo&product=${slug}`}>
              Schedule a demo
            </Link>
          </Button>
        </div>
      </div>

      {viewer ? (
        <ViewerDialog
          onClose={() => {
            setViewerOpen(false);
            viewerButtonRef.current?.focus();
          }}
          open={viewerOpen}
          product={viewer}
        />
      ) : null}
    </section>
  );
}
