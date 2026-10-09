import { Button } from "@workspace/ui/components/button";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";

export const metadata: Metadata = {
  title: "Message sent",
  robots: { index: false },
};

/** Where the contact form lands after a no-JavaScript submit. */
export default function ContactSentPage() {
  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Contact", href: "/contact" },
          { label: "Message sent" },
        ]}
      />
      <main className="container py-12 md:py-16">
        <div
          className="flex max-w-xl flex-col items-start gap-6 border border-border p-8"
          role="status"
        >
          <span className="grid size-12 place-items-center bg-foreground text-background">
            <Check className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-normal text-2xl leading-8 tracking-[-0.02em]">
              Thanks, your message is on its way.
            </h1>
            <p className="text-muted-foreground leading-6">
              Demo: messages aren't sent anywhere, but this is where a real
              project would confirm it's on its way.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/products">Browse products</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
