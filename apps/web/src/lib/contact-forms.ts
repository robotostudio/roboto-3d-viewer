import { z } from "zod/v4";

/**
 * Shared rules for the enquiry and contact forms: the browser checks them
 * before sending (instant errors) and the server actions check them again,
 * since anything posted to an action can be forged.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const contactDetailsSchema = z.object({
  name: trimmed(120).min(2, "Enter your name."),
  email: z
    .string()
    .trim()
    .max(200)
    .pipe(z.email("Enter a valid email address.")),
  organisation: trimmed(160).optional().default(""),
  role: trimmed(120).optional().default(""),
  phone: trimmed(40).optional().default(""),
  country: trimmed(80).optional().default(""),
  consent: z
    .boolean()
    .refine((agreed) => agreed, "Please agree to be contacted."),
  /** Honeypot: people never see it, bots fill it in. */
  website: z.string().max(0).optional().default(""),
});

export const enquirySchema = contactDetailsSchema.extend({
  message: trimmed(2000).optional().default(""),
  items: z
    .array(
      z.object({
        slug: trimmed(120).min(1),
        title: trimmed(160).min(1),
        version: trimmed(160).optional(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, "Add at least one product.")
    .max(50),
});

export const CONTACT_TOPICS = [
  { value: "demo", label: "Schedule a demo" },
  { value: "quote", label: "Request a quote" },
  { value: "product", label: "Product question" },
  { value: "support", label: "Service & support" },
  { value: "other", label: "Something else" },
] as const;

export const contactSchema = contactDetailsSchema.extend({
  topic: z.enum(CONTACT_TOPICS.map((topic) => topic.value)),
  product: trimmed(120).optional().default(""),
  message: trimmed(2000).min(10, "Tell us a little more (10+ characters)."),
});

export type EnquiryInput = z.input<typeof enquirySchema>;
export type ContactInput = z.input<typeof contactSchema>;
export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

/** The contact form's fields as the action expects them. Shared by the
 * client submit and the no-JS POST route, so both read the form the same way. */
export function contactFromFormData(form: FormData): ContactInput {
  const text = (name: string) => String(form.get(name) ?? "");
  return {
    topic: text("topic") as ContactTopic,
    product: text("product"),
    name: text("name"),
    email: text("email"),
    organisation: text("organisation"),
    phone: text("phone"),
    message: text("message"),
    website: text("website"),
    consent: form.get("consent") === "on",
  };
}

/** Pre-selected topic and product from `?topic=&product=` (product pages
 * link here that way). With no params: "Schedule a demo", no product. */
export function contactPrefill(
  params: { topic?: string; product?: string },
  productSlugs: string[]
): { topic: ContactTopic; product: string } {
  const product =
    params.product && productSlugs.includes(params.product)
      ? params.product
      : "";
  const topic =
    CONTACT_TOPICS.find((entry) => entry.value === params.topic)?.value ??
    (product ? "product" : "demo");
  return { topic, product };
}

/** Field → first error message, for showing beside each field. */
export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= issue.message;
  }
  return errors;
}

export type FormResult =
  | { ok: true }
  | { ok: false; errors: FieldErrors; message?: string };
