import {
  DRAFTS_WITHOUT_SESSION,
  type DynamicFetchOptions,
  resolvePageFetchOptions,
  sanityFetch,
} from "@workspace/sanity/live";
import { queryProductIndex } from "@workspace/sanity/query";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { stegaClean } from "next-sanity";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ContactForm } from "@/components/contact/contact-form";
import { contactPrefill } from "@/lib/contact-forms";
import { getSEOMetadata } from "@/lib/seo";
import { CONTACT_COPY } from "@/lib/site-copy";

export function generateMetadata(): Promise<Metadata> {
  return getSEOMetadata({
    title: "Contact",
    description:
      "Schedule a demo, request a quote or ask about Cobot C6. A Roboto Studio demo: the form works, but nothing is sent.",
    slug: "/contact",
  });
}

type ContactPageProps = {
  searchParams: Promise<{
    topic?: string | string[];
    product?: string | string[];
  }>;
};

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const { isEnabled: isDraftMode } = await draftMode();
  const products =
    isDraftMode || DRAFTS_WITHOUT_SESSION
      ? await getProducts(await resolvePageFetchOptions())
      : await getProducts({ perspective: "published", stega: false });

  return (
    <>
      <Breadcrumbs
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />
      <main className="container grid gap-16 py-12 md:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-24">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <p className="font-mono text-muted-foreground text-sm uppercase leading-6 tracking-[0.24px]">
              {CONTACT_COPY.eyebrow}
            </p>
            <h1 className="font-normal text-4xl text-foreground leading-tight tracking-[-0.24px] md:text-5xl">
              {CONTACT_COPY.title}
            </h1>
            <p className="text-base text-muted-foreground leading-7 sm:text-lg">
              {CONTACT_COPY.intro}
            </p>
          </div>
          <dl className="grid gap-8 border-border border-t pt-8">
            {CONTACT_COPY.links.map((link) => (
              <div className="flex flex-col gap-1" key={link.url}>
                <dt className="font-mono text-muted-foreground text-xs uppercase leading-4 tracking-[0.24px]">
                  {link.label}
                </dt>
                <dd>
                  <a
                    className="link-underline"
                    href={link.url}
                    rel="noopener"
                    target="_blank"
                  >
                    {link.text}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        {/* The fallback is the complete form, so it's there at once and
            without JavaScript. Only the optional ?topic=&product= prefill
            (from "Schedule a demo") waits on the URL, then swaps in. */}
        <div className="border border-border p-6 sm:p-8 lg:p-10">
          <Suspense fallback={<ContactForm products={products} />}>
            <PrefilledContactForm
              products={products}
              searchParams={searchParams}
            />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function PrefilledContactForm({
  products,
  searchParams,
}: Readonly<
  ContactPageProps & { products: { slug: string; title: string }[] }
>) {
  const params = await searchParams;
  const first = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const prefill = contactPrefill(
    { topic: first(params.topic), product: first(params.product) },
    products.map((product) => product.slug)
  );
  return (
    <ContactForm
      defaultProduct={prefill.product}
      defaultTopic={prefill.topic}
      products={products}
    />
  );
}

async function getProducts({ perspective, stega }: DynamicFetchOptions) {
  "use cache";
  const { data } = await sanityFetch({
    query: queryProductIndex,
    perspective,
    stega,
  });
  return (data ?? []).flatMap((product) => {
    const slug = stegaClean(product.slug)?.replace(/^\/products\//, "");
    return slug && product.title
      ? [{ slug, title: stegaClean(product.title) ?? product.title }]
      : [];
  });
}
