"use client";

import { SanityImage } from "@workspace/sanity-blocks/internal/sanity-image";
import { Trash2 } from "lucide-react";
import Link from "next/link";

import { type EnquiryItem, useEnquiry } from "./enquiry-context";
import { QuantityStepper } from "./quantity-stepper";

/** One product in the drawer: picture, name, version, quantity, remove. */
export function EnquiryLineItem({ item }: Readonly<{ item: EnquiryItem }>) {
  const { setQuantity, remove, close } = useEnquiry();

  return (
    <li className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 border-border border-b py-5 last:border-b-0">
      <Link
        aria-hidden="true"
        className="relative block size-20 overflow-hidden bg-card"
        href={`/products/${item.slug}`}
        onClick={close}
        tabIndex={-1}
      >
        {item.image?.id ? (
          <SanityImage
            alt=""
            className="absolute inset-0 size-full object-contain! p-1.5"
            height={160}
            image={item.image}
            mode="contain"
            width={160}
          />
        ) : null}
      </Link>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {item.category ? (
              <p className="truncate font-mono text-muted-foreground text-xs uppercase leading-4 tracking-[0.24px]">
                {item.category}
              </p>
            ) : null}
            <Link
              className="mt-1 block truncate text-base leading-6 underline-offset-4 hover:underline"
              href={`/products/${item.slug}`}
              onClick={close}
            >
              {item.title}
            </Link>
            {item.version ? (
              <p className="truncate text-muted-foreground text-sm leading-5">
                {item.version.label}
              </p>
            ) : null}
          </div>
          <button
            aria-label={`Remove ${item.title} from enquiry`}
            className="-mt-1 -mr-2 grid size-9 shrink-0 place-items-center text-muted-foreground transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-ring-inset"
            onClick={() => remove(item.key)}
            type="button"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        <QuantityStepper
          label={item.title}
          onChange={(quantity) => setQuantity(item.key, quantity)}
          size="sm"
          value={item.quantity}
        />
      </div>
    </li>
  );
}
