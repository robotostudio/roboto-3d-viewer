"use client";

import { Button } from "@workspace/ui/components/button";
import { type FormEvent, useState, useTransition } from "react";

import { submitEnquiry } from "@/app/actions/enquiry";
import {
  CheckboxField,
  HoneypotField,
  TextAreaField,
  TextField,
} from "@/components/form/field";
import {
  type EnquiryInput,
  enquirySchema,
  type FieldErrors,
  fieldErrors,
} from "@/lib/contact-forms";
import { useEnquiry } from "./enquiry-context";

/** Contact details for the enquiry; the products come from the list. */
export function EnquiryForm({
  onSent,
}: Readonly<{ onSent: (summary: string[]) => void }>) {
  const { items, clear } = useEnquiry();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const payload: EnquiryInput = {
      name: text("name"),
      email: text("email"),
      organisation: text("organisation"),
      role: text("role"),
      phone: text("phone"),
      country: text("country"),
      message: text("message"),
      website: text("website"),
      consent: form.get("consent") === "on",
      items: items.map((item) => ({
        slug: item.slug,
        title: item.title,
        version: item.version?.label,
        quantity: item.quantity,
      })),
    };
    const checked = enquirySchema.safeParse(payload);
    if (!checked.success) {
      setErrors(fieldErrors(checked.error));
      return;
    }
    setErrors({});
    setFailure(null);
    startTransition(async () => {
      try {
        const result = await submitEnquiry(payload);
        if (result.ok) {
          onSent(
            items.map(
              (item) =>
                `${item.quantity} × ${item.version?.label ?? item.title}`
            )
          );
          clear();
        } else {
          setErrors(result.errors);
          setFailure(result.message ?? null);
        }
      } catch {
        setFailure("Something went wrong. Please try again or call us.");
      }
    });
  };

  return (
    <form
      className="relative grid gap-5"
      id="enquiry-form"
      noValidate
      onSubmit={onSubmit}
    >
      <HoneypotField />
      <TextField
        autoComplete="name"
        error={errors.name}
        label="Name"
        name="name"
        required
      />
      <TextField
        autoComplete="email"
        error={errors.email}
        label="Email"
        name="email"
        required
        type="email"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          autoComplete="organization"
          error={errors.organisation}
          label="Practice or organisation"
          name="organisation"
        />
        <TextField
          autoComplete="organization-title"
          error={errors.role}
          label="Role"
          name="role"
        />
        <TextField
          autoComplete="tel"
          error={errors.phone}
          label="Phone"
          name="phone"
          type="tel"
        />
        <TextField
          autoComplete="country-name"
          error={errors.country}
          label="Country"
          name="country"
        />
      </div>
      <TextAreaField
        error={errors.message}
        label="Anything we should know?"
        name="message"
        placeholder="Timing, practice size, questions about the products…"
      />
      <CheckboxField
        error={errors.consent}
        label="I agree to being contacted about this enquiry."
        name="consent"
      />
      {errors.items ? (
        <p className="text-danger text-sm">{errors.items}</p>
      ) : null}
      {failure ? (
        <p className="text-danger text-sm" role="alert">
          {failure}
        </p>
      ) : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Sending…" : "Send enquiry"}
      </Button>
      <p className="-mt-2 text-center text-muted-foreground text-xs leading-5">
        Demo: enquiries aren't sent anywhere.
      </p>
    </form>
  );
}
