import { Button } from "@workspace/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";

export const metadata: Metadata = {
  title: "Message not sent",
  robots: { index: false },
};

/**
 * Where a no-JavaScript contact submit lands when the server rejects it (the
 * browser's checks passed but contactSchema didn't). Static, so it shows
 * without JS; with JS the form reports errors inline and never comes here.
 */
export default function ContactNotSentPage() {
  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Contact", href: "/contact" },
          { label: "Message not sent" },
        ]}
      />
      <main className="container py-12 md:py-16">
        <div
          className="flex max-w-xl flex-col items-start gap-6 border border-border p-8"
          role="alert"
        >
          <div className="flex flex-col gap-2">
            <h1 className="font-normal text-2xl leading-8 tracking-[-0.02em]">
              Your message wasn't sent.
            </h1>
            <p className="text-muted-foreground leading-6">
              Something in the form needs another look: check your name (at
              least 2 characters), email address and message (at least 10
              characters), then try again.
            </p>
          </div>
          <Button asChild>
            <Link href="/contact">Back to the form</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
