"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { PropsWithChildren } from "react";

import { EnquiryProvider } from "@/components/enquiry/enquiry-context";
import { EnquiryDrawer } from "@/components/enquiry/enquiry-drawer";

const queryClient = new QueryClient();

export function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableColorScheme
        enableSystem
      >
        <EnquiryProvider>
          {children}
          {/* One enquiry drawer for the whole site, opened from anywhere. */}
          <EnquiryDrawer />
        </EnquiryProvider>
      </NextThemesProvider>
    </QueryClientProvider>
  );
}
