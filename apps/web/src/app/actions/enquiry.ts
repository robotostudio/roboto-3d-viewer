"use server";

import { Logger } from "@workspace/logger";

import {
  type EnquiryInput,
  enquirySchema,
  type FormResult,
  fieldErrors,
} from "@/lib/contact-forms";

const logger = new Logger("enquiry");

/**
 * DEMO MODE: nothing is sent or stored, on purpose (this is a public demo;
 * the forms say so). For a real project, wire this one function to:
 * - a Sanity document (SANITY_API_WRITE_TOKEN is already in the env schema),
 * - an email via Resend,
 * - or a CRM such as HubSpot.
 */
async function deliverEnquiry(
  _enquiry: ReturnType<typeof enquirySchema.parse>
) {
  // Demo: intentionally a no-op.
}

/** Validates an enquiry (products + contact details) and hands it on. */
export async function submitEnquiry(input: EnquiryInput): Promise<FormResult> {
  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  // A filled honeypot is a bot: pretend it worked, keep nothing.
  if (parsed.data.website) {
    return { ok: true };
  }
  await deliverEnquiry(parsed.data);
  logger.info("received (demo, not delivered)", {
    products: parsed.data.items.map((item) => `${item.quantity}× ${item.slug}`),
    hasMessage: Boolean(parsed.data.message),
  });
  return { ok: true };
}
