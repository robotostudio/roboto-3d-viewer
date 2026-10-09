import { submitContact } from "@/app/actions/contact";
import { contactFromFormData } from "@/lib/contact-forms";

/**
 * The contact form's no-JavaScript path: a plain form POST lands here. With
 * JS the form submits through the server action instead and never hits this.
 * Browser validation (required, email, length limits matching contactSchema)
 * runs first, so a rejected post is rare. When it happens the visitor lands
 * on a page that says so, rather than a silently reset form.
 */
export async function POST(request: Request): Promise<Response> {
  const result = await submitContact(
    contactFromFormData(await request.formData())
  );
  const target = result.ok ? "/contact/sent" : "/contact/not-sent";
  return Response.redirect(new URL(target, request.url), 303);
}
