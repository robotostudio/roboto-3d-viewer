import {
  DRAFTS_WITHOUT_SESSION,
  type DynamicFetchOptions,
  getDynamicFetchOptions,
  resolvePageFetchOptions,
  sanityFetch,
  sanityFetchMetadata,
  sanityFetchStaticParams,
} from "@workspace/sanity/live";
import {
  queryProductPageData,
  queryProductPaths,
} from "@workspace/sanity/query";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageBuilder } from "@/components/pagebuilder";
import { ProductDetail } from "@/components/product-detail/product-detail";
import { seoFromDocument } from "@/lib/seo";
import { PLACEHOLDER_SLUG } from "@/utils";

type ProductParams = { slug: string };

const PREFIX = "/products/";
const toPath = (slug: string) => `${PREFIX}${slug}`;

export async function generateStaticParams() {
  const { data: paths } = await sanityFetchStaticParams({
    query: queryProductPaths,
  });
  const slugs = (paths ?? []).flatMap((path) =>
    path?.startsWith(PREFIX) ? [path.slice(PREFIX.length)] : []
  );
  return slugs.length > 0
    ? slugs.map((slug) => ({ slug }))
    : [{ slug: PLACEHOLDER_SLUG }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ProductParams>;
}): Promise<Metadata> {
  const [{ slug }, { perspective }] = await Promise.all([
    params,
    getDynamicFetchOptions(),
  ]);
  const { data } = await sanityFetchMetadata({
    query: queryProductPageData,
    params: { slug: toPath(slug) },
    perspective,
  });
  return seoFromDocument(data, { slug: toPath(slug) });
}

export default async function ProductPage({
  params,
}: Readonly<{ params: Promise<ProductParams> }>) {
  const { isEnabled: isDraftMode } = await draftMode();

  if (isDraftMode || DRAFTS_WITHOUT_SESSION) {
    return (
      <Suspense fallback={null}>
        <DraftProductPage params={params} />
      </Suspense>
    );
  }

  // Published render, with a real 404 rather than one streamed in Suspense.
  const { slug } = await params;
  const data = await getProductPage({
    slug,
    perspective: "published",
    stega: false,
  });
  if (!data) {
    notFound();
  }
  return <ProductPageContent data={data} />;
}

async function DraftProductPage({
  params,
}: Readonly<{ params: Promise<ProductParams> }>) {
  const [{ slug }, options] = await Promise.all([
    params,
    resolvePageFetchOptions(),
  ]);
  const data = await getProductPage({ slug, ...options });
  if (!data) {
    notFound();
  }
  return <ProductPageContent data={data} />;
}

async function getProductPage({
  slug,
  perspective,
  stega,
}: ProductParams & DynamicFetchOptions) {
  "use cache";
  const { data } = await sanityFetch({
    query: queryProductPageData,
    params: { slug: toPath(slug) },
    perspective,
    stega,
  });
  return data;
}

type ProductPageData = NonNullable<Awaited<ReturnType<typeof getProductPage>>>;

function ProductPageContent({ data }: Readonly<{ data: ProductPageData }>) {
  const { _id, _type, pageBuilder, title } = data;

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          { label: title ?? "Product" },
        ]}
      />
      <main>
        <ProductDetail data={data} />
        {Array.isArray(pageBuilder) && pageBuilder.length > 0 ? (
          <PageBuilder id={_id} pageBuilder={pageBuilder} type={_type} />
        ) : null}
      </main>
    </>
  );
}
