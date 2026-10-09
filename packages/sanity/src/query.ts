import { ctaGroqProjection } from "@workspace/sanity-blocks/cta/cta.groq";
import { faqAccordionGroqProjection } from "@workspace/sanity-blocks/faq-accordion/faq-accordion.groq";
import { featureCardsIconGroqProjection } from "@workspace/sanity-blocks/feature-cards-icon/feature-cards-icon.groq";
import { heroGroqProjection } from "@workspace/sanity-blocks/hero/hero.groq";
import { heroSplitGroqProjection } from "@workspace/sanity-blocks/hero-split/hero-split.groq";
import { logoCloudGroqProjection } from "@workspace/sanity-blocks/logo-cloud/logo-cloud.groq";
import { product3dFields } from "@workspace/sanity-blocks/product-viewer/product-3d.groq";
import { productViewerGroqProjection } from "@workspace/sanity-blocks/product-viewer/product-viewer.groq";
import { richTextBlockGroqProjection } from "@workspace/sanity-blocks/rich-text-block/rich-text-block.groq";
import { showcaseGridGroqProjection } from "@workspace/sanity-blocks/showcase-grid/showcase-grid.groq";
import { socialGridGroqProjection } from "@workspace/sanity-blocks/social-grid/social-grid.groq";
import { subscribeNewsletterGroqProjection } from "@workspace/sanity-blocks/subscribe-newsletter/subscribe-newsletter.groq";
import { videoFeatureGroqProjection } from "@workspace/sanity-blocks/video-feature/video-feature.groq";
import { defineQuery } from "next-sanity";

const imageFields = /* groq */ `
  "id": asset._ref,
  "preview": asset->metadata.lqip,
  "alt": coalesce(
    alt,
    asset->altText,
    caption,
    asset->originalFilename,
    "untitled"
  ),
  hotspot {
    x,
    y
  },
  crop {
    bottom,
    left,
    right,
    top
  }
`;
const imageFragment = /* groq */ `
  image {
    ${imageFields}
  }
`;

const customLinkFragment = /* groq */ `
  ...customLink{
    openInNewTab,
    "href": select(
      type == "internal" => internal->slug.current,
      type == "external" => external,
      "#"
    ),
  }
`;

const markDefsFragment = /* groq */ `
  markDefs[]{
    ...,
    ${customLinkFragment}
  }
`;

const richTextFragment = /* groq */ `
  richText[]{
    ...,
    _type == "block" => {
      ...,
      ${markDefsFragment}
    },
    _type == "image" => {
      ${imageFields},
      "caption": caption
    },
    _type == "table" => {
      ...,
      rows[]{
        ...,
        cells[]{
          ...,
          value[]{
            ...,
            _type == "block" => {
              ...,
              ${markDefsFragment}
            }
          }
        }
      }
    }
  }
`;

const blogAuthorFragment = /* groq */ `
  authors[0]->{
    _id,
    name,
    position,
    ${imageFragment}
  }
`;

const blogCardFragment = /* groq */ `
  _type,
  _id,
  title,
  description,
  "slug":slug.current,
  orderRank,
  category,
  ${imageFragment},
  publishedAt,
  ${blogAuthorFragment}
`;

const buttonsFragment = /* groq */ `
  buttons[]{
    text,
    variant,
    _key,
    _type,
    "openInNewTab": url.openInNewTab,
    "href": select(
      url.type == "internal" => url.internal->slug.current,
      url.type == "external" => url.external,
      url.href
    ),
  }
`;

// Page builder block fragments are owned by their respective block packages
// in @workspace/sanity-blocks, imported above, so the GROQ projection and
// the component that reads it stay in lockstep.
const pageBuilderFragment = /* groq */ `
  pageBuilder[]{
    ...,
    _type,
    ${ctaGroqProjection},
    ${heroGroqProjection},
    ${heroSplitGroqProjection},
    ${faqAccordionGroqProjection},
    ${featureCardsIconGroqProjection},
    ${subscribeNewsletterGroqProjection},
    ${logoCloudGroqProjection},
    ${socialGridGroqProjection},
    ${showcaseGridGroqProjection},
    ${richTextBlockGroqProjection},
    ${videoFeatureGroqProjection},
    ${productViewerGroqProjection}
  }
`;

/** Card fields for a product: the products index and related products. */
const productCardFields = /* groq */ `
  _id,
  title,
  category,
  description,
  "slug": slug.current,
  "image": gallery[0]{ "id": asset._ref, "preview": asset->metadata.lqip, alt },
  "has3d": defined(model) && defined(overviewPose)
`;

/** A product page: its 3D viewer data, detail copy, SEO and page builder. */
export const queryProductPageData = defineQuery(`
  *[_type == "product" && defined(slug.current) && slug.current == $slug][0]{
    ...,
    ogTitle,
    "ogImage": seoImage.asset->url + "?w=1200&h=630&dpr=2&fit=max",
    ${product3dFields},
    gallery[]{ _key, "id": asset._ref, "preview": asset->metadata.lqip, alt },
    details,
    keyFacts[]{ _key, label, value },
    specs[]{ _key, label, value },
    dimensions[]{ _key, label, value },
    faqs[]{ _key, question, answer },
    "related": related[]->{ ${productCardFields} },
    ${pageBuilderFragment}
  }
`);

/** Every product with a gallery image, for the /products index. */
export const queryProductIndex = defineQuery(`
  *[_type == "product" && defined(slug.current) && count(gallery) > 0]
    | order(title asc){ ${productCardFields} }
`);

export const queryProductPaths = defineQuery(`
  *[_type == "product" && defined(slug.current)].slug.current
`);

/** Type-reference only — never fetched; drives TS inference for image objects. */
export const queryImageType = defineQuery(`
  *[_type == "page" && defined(image)][0]{
    ${imageFragment}
  }.image
`);

export const queryHomePageData =
  defineQuery(`*[_type == "homePage" && _id == "homePage"][0]{
    ...,
    _id,
    _type,
    "slug": slug.current,
    title,
    description,
    ogTitle,
    "ogImage": seoImage.asset->url + "?w=1200&h=630&fit=crop&fm=jpg&q=80",
    ${pageBuilderFragment}
  }`);

export const querySlugPageData = defineQuery(`
  *[_type == "page" && defined(slug.current) && slug.current == $slug][0]{
    ...,
    "slug": slug.current,
    ogTitle,
    "ogImage": seoImage.asset->url + "?w=1200&h=630&fit=crop&fm=jpg&q=80",
    ${pageBuilderFragment}
  }
  `);

export const querySlugPagePaths = defineQuery(`
  *[_type == "page" && defined(slug.current)].slug.current
`);

/**
 * The whole blog index page in one round trip. The list excludes featured
 * posts only when no category is active (`$category == ""`) — the same
 * condition that renders the strip — so a promoted post is never counted
 * twice or paginated into a gap.
 */
export const queryBlogIndexPage = defineQuery(`
  *[_type == "blogIndex"][0]{
    ...,
    _id,
    _type,
    title,
    description,
    ogTitle,
    "ogImage": seoImage.asset->url + "?w=1200&h=630&fit=crop&fm=jpg&q=80",
    ${pageBuilderFragment},
    "slug": slug.current,
    "featuredBlogs": select(
      $category == "" => *[_type == "blog" && featured == true && defined(slug.current) && (seoHideFromLists != true)] | order(orderRank asc){
        ${blogCardFragment}
      },
      []
    ),
    "blogs": *[_type == "blog" && defined(slug.current) && (seoHideFromLists != true) && ($category == "" || category == $category) && ($category != "" || featured != true)] | order(orderRank asc) [$start...$end]{
      ${blogCardFragment}
    },
    "total": count(*[_type == "blog" && defined(slug.current) && (seoHideFromLists != true) && ($category == "" || category == $category) && ($category != "" || featured != true)])
  }
`);

export const queryAllBlogDataForSearch = defineQuery(`
  *[_type == "blog" && defined(slug.current) && (seoHideFromLists != true)]{
    ${blogCardFragment}
  }
`);

export const queryBlogSlugPageData = defineQuery(`
  *[_type == "blog" && slug.current == $slug][0]{
    ...,
    "slug": slug.current,
    ogTitle,
    "ogImage": seoImage.asset->url + "?w=1200&h=630&fit=crop&fm=jpg&q=80",
    ${blogAuthorFragment},
    ${imageFragment},
    ${richTextFragment},
    ${pageBuilderFragment}
  }
`);

export const queryBlogPaths = defineQuery(`
  *[_type == "blog" && defined(slug.current)].slug.current
`);

export const queryFooterData = defineQuery(`
  *[_type == "footer" && _id == "footer"][0]{
    _id,
    subtitle,
    columns[]{
      _key,
      title,
      links[]{
        _key,
        name,
        "openInNewTab": url.openInNewTab,
        "href": select(
          url.type == "internal" => url.internal->slug.current,
          url.type == "external" => url.external,
          url.href
        ),
      }
    },
    copyright,
    credits[]{
      _key,
      label,
      url,
      logo {
        ${imageFields}
      }
    }
  }
`);

export const queryNavbarData = defineQuery(`
  *[_type == "navbar" && _id == "navbar"][0]{
    _id,
    columns[]{
      _key,
      _type == "navbarColumn" => {
        "type": "column",
        title,
        links[]{
          _key,
          name,
          icon,
          description,
          "openInNewTab": url.openInNewTab,
          "href": select(
            url.type == "internal" => url.internal->slug.current,
            url.type == "external" => url.external,
            url.href
          )
        }
      },
      _type == "navbarLink" => {
        "type": "link",
        name,
        description,
        "openInNewTab": url.openInNewTab,
        "href": select(
          url.type == "internal" => url.internal->slug.current,
          url.type == "external" => url.external,
          url.href
        )
      }
    },
    ${buttonsFragment},
    gitHubUrl,
  }
`);

// The set of publicly indexable URLs, shared by the sitemap and llms.txt.
// `seoNoIndex` is excluded here as well as in the page metadata — advertising a
// URL in the sitemap while its own robots tag says noindex is a contradiction
// search engines report as an error. `title` and the ordering serve llms.txt;
// the sitemap ignores both.
export const querySitemapData = defineQuery(`{
  "slugPages": *[_type == "page" && defined(slug.current) && seoNoIndex != true]{
    "slug": slug.current,
    "lastModified": _updatedAt
  },
  "blogPages": *[_type == "blog" && defined(slug.current) && seoNoIndex != true] | order(orderRank asc){
    "slug": slug.current,
    "lastModified": _updatedAt,
    title
  },
  "productPages": *[_type == "product" && defined(slug.current) && seoNoIndex != true]{
    "slug": slug.current,
    "lastModified": _updatedAt
  }
}`);
export const queryGlobalSeoSettings = defineQuery(`
  *[_type == "settings"][0]{
    _id,
    _type,
    siteTitle,
    logos {
      logo {
        ${imageFields}
      },
      logoDark {
        ${imageFields}
      },
      footerLogo {
        ${imageFields}
      }
    },
    favicon {
      "svg": svg.asset->url,
      "ico": ico.asset->url
    },
    "ogImage": ogImage.asset->url + "?w=1200&h=630&fit=crop&fm=jpg&q=80",
    siteDescription,
    socialLinks{
      linkedin,
      facebook,
      twitter,
      instagram,
      youtube,
      reddit
    }
  }
`);

export const querySettingsData = defineQuery(`
  *[_type == "settings"][0]{
    _id,
    _type,
    siteTitle,
    siteDescription,
    "logo": logos.logo.asset->url + "?w=80&h=40&dpr=3&fit=max",
    "socialLinks": socialLinks,
    "contactEmail": contactEmail,
  }
`);

export const queryRedirects = defineQuery(`
  *[_type == "redirect" && status == "active" && defined(source.current) && defined(destination.current)]{
    "source":source.current, 
    "destination":destination.current, 
    "permanent" : permanent == "true"
  }
`);
