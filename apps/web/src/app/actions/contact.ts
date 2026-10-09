"use server";

import { Logger } from "@workspace/logger";

import {
  type ContactInput,
  contactSchema,
  type FormResult,
  fieldErrors,
} from "@/lib/contact-forms";

const logger = new Logger("contact");

/**
 * DEMO MODE: nothing is sent or stored, on purpose (this is a public demo;
 * the forms say so). For a real project, wire this one function to:
 * - a Sanity document (SANITY_API_WRITE_TOKEN is already in the env schema),
 * - an email via Resend,
 * - or a CRM such as HubSpot.
 */
async function deliverContact(
  _message: ReturnType<typeof contactSchema.parse>
) {
  // Demo: intentionally a no-op.
}

/** Validates a contact-page message and hands it on. */
export async function submitContact(input: ContactInput): Promise<FormResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  if (parsed.data.website) {
    return { ok: true };
  }
  await deliverContact(parsed.data);
  logger.info("received (demo, not delivered)", {
    topic: parsed.data.topic,
    product: parsed.data.product || null,
  });
  return { ok: true };
}
