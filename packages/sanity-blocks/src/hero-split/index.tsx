import type { ButtonProps } from "@workspace/sanity-blocks/internal/sanity-buttons";
import { SanityButtons } from "@workspace/sanity-blocks/internal/sanity-buttons";
import type { SanityImageData } from "@workspace/sanity-blocks/internal/sanity-image";
import {
  resolveAssetId,
  SanityImage,
} from "@workspace/sanity-blocks/internal/sanity-image";

export interface HeroSplitProps {
  buttons?: ButtonProps[] | null;
  image?: SanityImageData | null;
  isFirst?: boolean;
  /** "cutout": a transparent image on the left, filling the screen height. */
  layout?: string | null;
  subtitle?: string | null;
  title?: string | null;
}

export function HeroSplit({
  buttons,
  image,
  isFirst,
  layout,
  subtitle,
  title,
}: Readonly<HeroSplitProps>) {
  const Heading = isFirst ? "h1" : "h2";

  if (layout === "cutout") {
    return (
      // Full screen height. The page's leading block sits under the navbar
      // (main is pulled up by its height), so pt-16 keeps the content clear.
      <section
        className="relative grid min-h-svh pt-16 lg:grid-cols-2"
        id="hero-split"
      >
        {resolveAssetId(image) && image ? (
          <div className="relative order-2 h-[55svh] lg:order-1 lg:h-auto">
            {/* The cutout stands on the fold: bottom-anchored, no box. */}
            <SanityImage
              className="absolute inset-0 size-full object-contain! object-bottom"
              fetchPriority={isFirst ? "high" : undefined}
              height={1800}
              image={image}
              loading={isFirst ? "eager" : "lazy"}
              mode="contain"
              sizes="(min-width: 64rem) 50vw, 100vw"
              width={1200}
            />
          </div>
        ) : null}
        <div className="container order-1 grid content-center gap-5 py-12 lg:order-2 lg:py-16">
          {title && (
            <Heading
              className="max-w-[18ch] text-balance font-normal text-4xl text-foreground tracking-tight md:text-5xl lg:text-6xl"
              data-inline-edit
            >
              {title}
            </Heading>
          )}
          {subtitle && (
            <p
              className="body-text max-w-[48ch] text-muted-foreground"
              data-inline-edit
            >
              {subtitle}
            </p>
          )}
          <SanityButtons buttons={buttons} className="pt-3" />
        </div>
      </section>
    );
  }

  return (
    <section className="block-section" id="hero-split">
      <div className="container grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="grid gap-5">
          {title && (
            <Heading
              className="max-w-[24ch] text-balance font-normal text-4xl text-foreground tracking-tight md:text-5xl lg:text-6xl"
              data-inline-edit
            >
              {title}
            </Heading>
          )}
          {subtitle && (
            <p
              className="body-text max-w-[48ch] text-muted-foreground"
              data-inline-edit
            >
              {subtitle}
            </p>
          )}
          <SanityButtons buttons={buttons} className="pt-3" />
        </div>
        {resolveAssetId(image) && image && (
          <div className="relative aspect-video overflow-hidden bg-muted outline-1 -outline-offset-1 outline-black/5 dark:outline-white/10">
            <SanityImage
              className="absolute inset-0 size-full object-cover"
              fetchPriority={isFirst ? "high" : undefined}
              height={900}
              image={image}
              loading={isFirst ? "eager" : "lazy"}
              mode="cover"
              sizes="(min-width: 64rem) 50vw, 100vw"
              width={1600}
            />
          </div>
        )}
      </div>
    </section>
  );
}
