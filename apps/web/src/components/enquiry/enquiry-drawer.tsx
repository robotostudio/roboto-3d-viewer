"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@workspace/tailwind-config/utils";
import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@workspace/ui/components/base-drawer";
import { Button } from "@workspace/ui/components/button";
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query";
import { ArrowLeft, Check, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useEnquiry } from "./enquiry-context";
import { EnquiryForm } from "./enquiry-form";
import { EnquiryLineItem } from "./enquiry-line-item";

const VIEWPORT_ANCHOR = {
  bottom: "items-end justify-center",
  right: "items-stretch justify-end",
} as const;

const POPUP_SLIDE = {
  bottom:
    "h-[90dvh] border-t origin-bottom [transform:translateY(var(--drawer-swipe-movement-y,0px))] data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]",
  right:
    "h-dvh max-w-md border-s origin-right [transform:translateX(var(--drawer-swipe-movement-x,0px))] data-starting-style:[transform:translateX(100%)] data-ending-style:[transform:translateX(100%)]",
} as const;

type Step = "list" | "details" | "sent";

const MONO = "font-mono text-xs uppercase leading-4 tracking-[0.24px]";

/**
 * The enquiry drawer: review products, add contact details, send. A right
 * sheet on wider screens and a bottom sheet on phones, like the mobile menu.
 */
export function EnquiryDrawer() {
  const { items, count, isOpen, open, close } = useEnquiry();
  const isPhone = useMediaQuery("(max-width: 767px)");
  const pathname = usePathname();
  const [step, setStep] = useState<Step>("list");
  const [sent, setSent] = useState<string[]>([]);
  // Keep the side fixed while open, so a resize never re-anchors the sheet.
  const [side, setSide] = useState<"bottom" | "right">("right");

  useEffect(() => {
    if (isOpen) {
      setSide(isPhone ? "bottom" : "right");
    }
  }, [isOpen, isPhone]);

  // A link inside (or browser navigation) moves on: close the drawer.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the route-change trigger.
  useEffect(() => {
    close();
  }, [pathname]);

  const onOpenChange = (next: boolean) => {
    if (next) {
      open();
      return;
    }
    close();
    // Start fresh next time, unless they were mid-form with items left.
    if (step === "sent") {
      setStep("list");
    }
  };

  return (
    <Drawer
      onOpenChange={onOpenChange}
      open={isOpen}
      swipeDirection={side === "right" ? "right" : "down"}
    >
      <DrawerPortal>
        {/* Slingshot's cart overlay: a dim, blurred black instead of the
            mobile menu's near-opaque white, so the page stays readable
            behind the sheet. */}
        <DrawerBackdrop className="bg-black opacity-[calc(0.2*(1-var(--drawer-swipe-progress,0)))] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] supports-backdrop-filter:backdrop-blur-3xl" />
        <DrawerViewport className={VIEWPORT_ANCHOR[side]}>
          <DrawerPopup
            className={cn(
              "w-full pb-[env(safe-area-inset-bottom)]",
              POPUP_SLIDE[side]
            )}
          >
            <DrawerContent>
              <header className="flex items-center justify-between gap-4 border-border border-b px-6 py-4">
                <div className="flex items-center gap-2">
                  {step === "details" ? (
                    <button
                      aria-label="Back to products"
                      className="-ml-2 grid size-9 place-items-center hover:bg-card focus-ring-inset"
                      onClick={() => setStep("list")}
                      type="button"
                    >
                      <ArrowLeft className="size-4" />
                    </button>
                  ) : null}
                  <DrawerTitle className="font-normal text-xl leading-7">
                    {step === "details" ? "Your details" : "Enquiry"}
                    {step === "list" && count > 0 ? (
                      <span className={cn(MONO, "ml-2 text-muted-foreground")}>
                        <NumberFlow respectMotionPreference value={count} />{" "}
                        {count === 1 ? "unit" : "units"}
                      </span>
                    ) : null}
                  </DrawerTitle>
                </div>
                <button
                  aria-label="Close enquiry"
                  className="-mr-2 grid size-9 place-items-center hover:bg-card focus-ring-inset"
                  onClick={close}
                  type="button"
                >
                  <X className="size-4" />
                </button>
              </header>

              {step === "sent" ? (
                <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-10">
                  <span className="grid size-12 place-items-center bg-foreground text-background">
                    <Check className="size-5" />
                  </span>
                  <div className="flex flex-col gap-2">
                    <p className="text-2xl leading-8 tracking-[-0.02em]">
                      Thanks, we've got your enquiry.
                    </p>
                    <p className="text-muted-foreground leading-6">
                      In a real project the team would now be in touch about
                      these. In this demo, nothing was sent:
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2 border-border border-y py-4 text-sm leading-6">
                    {sent.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <Button
                    className="mt-auto w-full"
                    onClick={close}
                    variant="outline"
                  >
                    Close
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-1 flex-col items-start justify-center gap-6 px-6 py-12">
                  <span className="grid size-12 place-items-center bg-card">
                    <ShoppingCart className="size-5 text-muted-foreground" />
                  </span>
                  <div className="flex flex-col gap-2">
                    <p className="text-2xl leading-8 tracking-[-0.02em]">
                      Your enquiry is empty.
                    </p>
                    <p className="text-muted-foreground leading-6">
                      Add the devices you're interested in and we'll put
                      together a quote.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/products" onClick={close}>
                      Browse products
                    </Link>
                  </Button>
                </div>
              ) : step === "details" ? (
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <EnquiryForm
                    onSent={(summary) => {
                      setSent(summary);
                      setStep("sent");
                    }}
                  />
                </div>
              ) : (
                <>
                  <ul className="flex-1 overflow-y-auto px-6">
                    {items.map((item) => (
                      <EnquiryLineItem item={item} key={item.key} />
                    ))}
                  </ul>
                  <footer className="flex flex-col gap-3 border-border border-t px-6 py-5">
                    <p className="text-muted-foreground text-sm leading-5">
                      No payment: the team replies with pricing and
                      availability. (Demo: enquiries aren't sent anywhere.)
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => setStep("details")}
                    >
                      Continue
                    </Button>
                    <Button asChild className="w-full" variant="outline">
                      <Link href="/products" onClick={close}>
                        Add more products
                      </Link>
                    </Button>
                  </footer>
                </>
              )}
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}
