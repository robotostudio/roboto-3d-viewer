import { toProduct } from "@workspace/product-3d/map-product";
import type { QueryProductPageDataResult } from "@workspace/sanity/types";
import { cn } from "@workspace/tailwind-config/utils";
import { stegaClean } from "next-sanity";
import type { ReactNode } from "react";

import { DetailHero } from "./detail-hero";
import { ProductCard } from "./product-card";

type ProductPageData = NonNullable<QueryProductPageDataResult>;
type Row = { _key: string; label: string | null; value: string | null };

/**
 * Product detail page: gallery and the fullscreen 3D viewer, overview,
 * specifications, FAQs and related products. Sections
 * without content are left out, so nothing is padded with made-up copy.
 */
export function ProductDetail({ data }: Readonly<{ data: ProductPageData }>) {
  const gallery = (data.gallery ?? []).flatMap((image) => {
    const id = stegaClean(image.id);
    return id
      ? [{ key: image._key, id, preview: image.preview, alt: image.alt ?? "" }]
      : [];
  });
  const keyFacts = (data.keyFacts ?? []).flatMap((fact) =>
    fact.label && fact.value
      ? [{ key: fact._key, label: fact.label, value: fact.value }]
      : []
  );

  return (
    <div className="container flex flex-col gap-24 py-12 md:gap-32 md:py-16">
      <DetailHero
        category={data.category}
        gallery={gallery}
        keyFacts={keyFacts}
        name={data.title ?? ""}
        slug={(stegaClean(data.slug) ?? "").replace(/^\/products\//, "")}
        summary={data.description}
        viewer={toProduct(data)}
      />
      <Overview data={data} />
      <Specifications
        dimensions={data.dimensions ?? []}
        specs={data.specs ?? []}
      />
      <Faqs data={data} />
      <Related data={data} />
    </div>
  );
}

function Overview({ data }: Readonly<{ data: ProductPageData }>) {
  const details = data.details ?? [];
  if (details.length === 0) {
    return null;
  }
  return (
    <Section eyebrow="Overview" title="Product details">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-5 text-lg leading-8">
          {details.map((paragraph) => (
            <p className="max-w-[68ch] text-pretty" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
        <aside className="flex flex-col gap-4 self-start bg-card p-8">
          <p className="font-mono text-muted-foreground text-xs uppercase leading-4 tracking-[0.24px]">
            Built with Sanity
          </p>
          <p className="text-2xl leading-8 tracking-[-0.02em]">
            Every word, image and hotspot here is edited in Sanity Studio.
          </p>
          <p className="text-base text-muted-foreground leading-7">
            Editors place hotspots by clicking the model and save camera shots
            with one button. No code, no redeploy.
          </p>
          <a
            className="link-underline self-start text-base"
            href={`/contact?product=${(stegaClean(data.slug) ?? "").replace(/^\/products\//, "")}`}
          >
            Questions? Contact us
          </a>
        </aside>
      </div>
    </Section>
  );
}

function Specifications({
  specs,
  dimensions,
}: Readonly<{ specs: Row[]; dimensions: Row[] }>) {
  if (specs.length + dimensions.length === 0) {
    return null;
  }
  return (
    <Section eyebrow="Specifications" title="Technical details">
      <div className="border-border border-b">
        <SpecGroup open rows={specs} title="Technical specifications" />
        <SpecGroup rows={dimensions} title="Dimensions and weight" />
      </div>
    </Section>
  );
}

function Faqs({ data }: Readonly<{ data: ProductPageData }>) {
  const faqs = data.faqs ?? [];
  if (faqs.length === 0) {
    return null;
  }
  return (
    <Section eyebrow="FAQ" title="Frequently asked questions">
      <div className="border-border border-b">
        {faqs.map((faq) => (
          <details className="group border-border border-t" key={faq._key}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg leading-7 [&::-webkit-details-marker]:hidden">
              {faq.question}
              <PlusMinus />
            </summary>
            <p className="max-w-[72ch] pb-6 text-muted-foreground leading-7">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function Related({ data }: Readonly<{ data: ProductPageData }>) {
  const related = data.related ?? [];
  if (related.length === 0) {
    return null;
  }
  return (
    <Section eyebrow="Explore more" title="Related products">
      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((item) => (
          <li key={item._id}>
            <ProductCard headingLevel="h3" product={item} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: Readonly<{ eyebrow: string; title: string; children: ReactNode }>) {
  return (
    <section className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-muted-foreground text-sm uppercase leading-6 tracking-[0.24px]">
          {eyebrow}
        </p>
        <h2 className="font-normal text-3xl leading-tight tracking-[-0.24px] md:text-4xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

/** A spec table that folds away (native <details>: no JS, keyboard ready). */
function SpecGroup({
  title,
  rows,
  open = false,
}: Readonly<{ title: string; rows: Row[]; open?: boolean }>) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <details className="group border-border border-t" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-xl leading-7 [&::-webkit-details-marker]:hidden">
        {title}
        <PlusMinus />
      </summary>
      <dl className="grid pb-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {rows.map((row, index) => (
          <div
            className={cn(
              "grid gap-1 px-4 py-4 md:col-span-2 md:grid-cols-subgrid md:gap-8",
              index % 2 === 0 && "bg-card"
            )}
            key={row._key}
          >
            <dt className="font-mono text-muted-foreground text-xs uppercase leading-6 tracking-[0.24px]">
              {row.label}
            </dt>
            <dd className="whitespace-pre-line text-base leading-6">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** + when closed, − when open; follows the parent <details> state. */
function PlusMinus() {
  return (
    <span aria-hidden="true" className="relative size-4 shrink-0">
      <span className="absolute top-1/2 left-0 h-[1.5px] w-4 -translate-y-1/2 bg-foreground" />
      <span className="absolute top-0 left-1/2 h-4 w-[1.5px] -translate-x-1/2 bg-foreground transition-transform duration-200 ease-out group-open:scale-y-0 motion-reduce:transition-none" />
    </span>
  );
}
