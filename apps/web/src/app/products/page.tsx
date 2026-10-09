import {
  DRAFTS_WITHOUT_SESSION,
  type DynamicFetchOptions,
  resolvePageFetchOptions,
  sanityFetch,
} from "@workspace/sanity/live";
import { queryProductIndex } from "@workspace/sanity/query";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/product-detail/product-card";
import { getSEOMetadata } from "@/lib/seo";
import { PRODUCTS_COPY } from "@/lib/site-copy";

export function generateMetadata(): Promise<Metadata> {
  return getSEOMetadata({
    title: "Products",
    description:
      "Robots with interactive 3D models you can rotate, explore and pull apart.",
    slug: "/products",
  });
}

export default async function ProductsPage() {
  const { isEnabled: isDraftMode } = await draftMode();

  if (isDraftMode || DRAFTS_WITHOUT_SESSION) {
    return (
      <Suspense fallback={null}>
        <DraftProducts />
      </Suspense>
    );
  }

  return <ProductIndex perspective="published" stega={false} />;
}

async function DraftProducts() {
  const options = await resolvePageFetchOptions();
  return <ProductIndex {...options} />;
}

/** Every product with a page, as a grid of cards. */
async function ProductIndex({ perspective, stega }: DynamicFetchOptions) {
  "use cache";
  const { data: products } = await sanityFetch({
    query: queryProductIndex,
    perspective,
    stega,
  });

  return (
    <>
      <Breadcrumbs
        crumbs={[{ label: "Home", href: "/" }, { label: "Products" }]}
      />
      <main className="container flex flex-col gap-10 py-12 md:gap-14 md:py-16">
        <div className="flex max-w-3xl flex-col gap-4">
          <h1 className="font-normal text-4xl text-foreground leading-tight tracking-[-0.24px] md:text-5xl lg:text-6xl">
            {PRODUCTS_COPY.title}
          </h1>
          <p className="text-base text-muted-foreground leading-6 sm:text-lg sm:leading-7">
            {PRODUCTS_COPY.intro}
          </p>
        </div>
        {products && products.length > 0 ? (
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <li key={product._id}>
                <ProductCard eager={index < 3} product={product} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No products yet.</p>
        )}
      </main>
    </>
  );
}
