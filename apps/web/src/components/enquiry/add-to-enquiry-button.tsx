"use client";

import { Button } from "@workspace/ui/components/button";
import { Check, ShoppingCart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type NewEnquiryItem, useEnquiry } from "./enquiry-context";

/** "Request a quote" for product cards: adds one and opens the drawer. */
export function AddToEnquiryButton({
  item,
  className,
}: Readonly<{ item: NewEnquiryItem; className?: string }>) {
  const { add, open } = useEnquiry();
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Button
      className={className}
      onClick={() => {
        add(item, 1);
        open();
        setAdded(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setAdded(false), 2000);
      }}
      size="sm"
      type="button"
    >
      {added ? (
        <Check className="size-4" />
      ) : (
        <ShoppingCart className="size-4" />
      )}
      {added ? "Added" : "Request a quote"}
      {/* Visible text first, then the product, so every card's button has
          a distinct name that still starts with what's on screen. */}
      <span className="sr-only"> for {item.title}</span>
    </Button>
  );
}
