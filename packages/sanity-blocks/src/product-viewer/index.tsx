import type { Product3dData } from "@workspace/product-3d/map-product";
import { toProduct } from "@workspace/product-3d/map-product";
import { ProductViewer } from "@workspace/product-3d/product-viewer";
import { BlockHeader } from "@workspace/sanity-blocks/internal/block-header";

export interface ProductViewerBlockProps {
  description?: string | null;
  eyebrow?: string | null;
  product?: (Product3dData & { description?: string | null }) | null;
  title?: string | null;
}

/**
 * A product's 3D viewer as a page-builder block: a heading, then the
 * explorer in a box with a fullscreen button. Renders nothing until the
 * product has a model and a starting camera shot.
 */
export function ProductViewerBlock({
  description,
  eyebrow,
  product,
  title,
}: Readonly<ProductViewerBlockProps>) {
  const viewerProduct = product ? toProduct(product) : null;
  if (!viewerProduct) {
    return null;
  }
  const summary = description ?? product?.description;

  return (
    <section className="block-section" id="product-viewer">
      <div className="container flex flex-col gap-10">
        <BlockHeader eyebrow={eyebrow} title={title ?? product?.name}>
          {summary ? (
            <p className="max-w-2xl text-base text-muted-foreground leading-6 sm:text-lg sm:leading-7">
              {summary}
            </p>
          ) : null}
        </BlockHeader>
        <ProductViewer product={viewerProduct} />
      </div>
    </section>
  );
}
