"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@workspace/tailwind-config/utils";
import { Button } from "@workspace/ui/components/button";
import { ShoppingCart } from "lucide-react";

import { useEnquiry } from "./enquiry-context";

/** Header button for the enquiry drawer, with a count once there's anything in it. */
export function EnquiryButton({ className }: Readonly<{ className?: string }>) {
  const { count, isHydrated, open } = useEnquiry();
  const shown = isHydrated && count > 0;

  return (
    <Button
      aria-label={
        shown
          ? `Enquiry, ${count} ${count === 1 ? "unit" : "units"}`
          : "Enquiry"
      }
      className={cn(
        "relative gap-1.5 rounded-none px-2.5 focus-visible:outline-offset-0!",
        className
      )}
      data-nav-adaptive=""
      onClick={open}
      size="sm"
      variant="ghost"
    >
      <ShoppingCart className="size-4" />
      {/* The count slides open on the first item (grid 0fr → 1fr, as in the
          slingshot-bio cart button) and rolls with NumberFlow after that. */}
      <span
        aria-hidden="true"
        className={cn(
          "grid transition-[grid-template-columns,opacity] duration-300 ease-out motion-reduce:transition-none",
          shown ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0"
        )}
      >
        <span className="overflow-hidden">
          <span className="grid h-5 min-w-5 place-items-center bg-foreground px-1 font-mono text-[11px] text-background tabular-nums leading-none">
            {count > 99 ? (
              "99+"
            ) : (
              <NumberFlow respectMotionPreference value={count} />
            )}
          </span>
        </span>
      </span>
    </Button>
  );
}
