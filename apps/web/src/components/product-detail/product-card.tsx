import { View3dIcon } from "@workspace/product-3d/icons";
import { SanityImage } from "@workspace/sanity-blocks/internal/sanity-image";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { stegaClean } from "next-sanity";

import { AddToEnquiryButton } from "@/components/enquiry/add-to-enquiry-button";

export type ProductCardData = {
  _id: string;
  title: string | null;
  category: string | null;
  description: string | null;
  slug: string | null;
  image: {
    id: string | null;
    preview: string | null;
    alt: string | null;
  } | null;
  has3d: boolean;
};

/** A product in the /products index and the related-products row. */
export function ProductCard({
  product,
  headingLevel = "h2",
  eager = false,
}: Readonly<{
  product: ProductCardData;
  headingLevel?: "h2" | "h3";
  /** Above the fold (the first cards in the index): load right away. */
  eager?: boolean;
}>) {
  const Heading = headingLevel;
  const href = stegaClean(product.slug);
  const imageId = stegaClean(product.image?.id);
  if (!href) {
    return null;
  }

  const slug = href.replace(/^\/products\//, "");

  return (
    // The title's link stretches over the whole card (after:inset-0), so the
    // card stays one click target while the add button sits above it.
    <article className="group relative flex h-full flex-col gap-5">
      <div className="relative aspect-[4/3] overflow-hidden bg-card">
        {imageId ? (
          // The site's image loading: pixelated preview first, then the
          // image, sized and formatted by Sanity's CDN.
          <SanityImage
            alt={product.image?.alt ?? ""}
            className="absolute inset-0 size-full object-contain! p-8 transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
            fetchPriority={eager ? "high" : undefined}
            height={900}
            image={{ ...product.image, id: imageId }}
            loading={eager ? "eager" : "lazy"}
            mode="contain"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            width={900}
          />
        ) : null}
        {product.has3d ? (
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-background px-2.5 py-1 font-mono text-xs uppercase leading-4 tracking-[0.24px]">
            <View3dIcon className="size-3.5" />
            Interactive 3D
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        {product.category ? (
          <p className="font-mono text-muted-foreground text-xs uppercase leading-4 tracking-[0.24px]">
            {product.category}
          </p>
        ) : null}
        <Heading className="font-normal text-2xl leading-8 tracking-[-0.02em]">
          <Link
            className="underline-offset-4 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:underline focus-visible:after:outline-2 focus-visible:after:outline-foreground focus-visible:after:outline-offset-4"
            href={href}
          >
            {product.title}
          </Link>
        </Heading>
        {product.description ? (
          <p className="line-clamp-2 text-muted-foreground text-sm leading-6">
            {product.description}
          </p>
        ) : null}
      </div>
      {/* relative z-10 lifts the buttons above the title's stretched link. */}
      <div className="relative z-10 mt-auto grid grid-cols-2 gap-3">
        <AddToEnquiryButton
          className="w-full gap-2"
          item={{
            slug,
            title: product.title ?? slug,
            category: product.category,
            image: imageId
              ? {
                  id: imageId,
                  preview: product.image?.preview,
                  alt: product.image?.alt,
                }
              : null,
          }}
        />
        <Button asChild className="w-full" size="sm" variant="outline">
          <Link href={href}>
            Learn more
            <span className="sr-only"> about {product.title}</span>
          </Link>
        </Button>
      </div>
    </article>
  );
}
