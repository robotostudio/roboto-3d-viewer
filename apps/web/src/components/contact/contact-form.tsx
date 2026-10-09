"use client";

import { Button } from "@workspace/ui/components/button";
import { Check } from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { submitContact } from "@/app/actions/contact";
import {
  CheckboxField,
  HoneypotField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/form/field";
import {
  CONTACT_TOPICS,
  type ContactTopic,
  contactFromFormData,
  contactSchema,
  type FieldErrors,
  fieldErrors,
} from "@/lib/contact-forms";

/**
 * The contact page form. It works on its own: without JavaScript it's a plain
 * POST to /contact/submit, checked by the browser's own validation (the
 * length limits mirror contactSchema, so the server rarely disagrees). With JS
 * it submits through the server action and shows errors inline. Product pages
 * link here with ?topic=demo&product=<slug>; the page passes those in.
 */
export function ContactForm({
  products,
  defaultTopic = "demo",
  defaultProduct = "",
}: Readonly<{
  products: { slug: string; title: string }[];
  defaultTopic?: ContactTopic;
  defaultProduct?: string;
}>) {
  const formRef = useRef<HTMLFormElement>(null);
  // Browser validation is the no-JS safety net; once JS runs, the form's own
  // inline errors take over.
  useEffect(() => {
    if (formRef.current) {
      formRef.current.noValidate = true;
    }
  }, []);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = contactFromFormData(new FormData(event.currentTarget));
    const checked = contactSchema.safeParse(payload);
    if (!checked.success) {
      setErrors(fieldErrors(checked.error));
      return;
    }
    setErrors({});
    setFailure(null);
    startTransition(async () => {
      try {
        const result = await submitContact(payload);
        if (result.ok) {
          setSent(true);
        } else {
          setErrors(result.errors);
          setFailure(result.message ?? null);
        }
      } catch {
        setFailure("Something went wrong. Please try again or call us.");
      }
    });
  };

  if (sent) {
    return (
      <div
        className="flex flex-col items-start gap-6 bg-card p-8"
        role="status"
      >
        <span className="grid size-12 place-items-center bg-foreground text-background">
          <Check className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <p className="text-2xl leading-8 tracking-[-0.02em]">
            Thanks, your message is on its way.
          </p>
          <p className="text-muted-foreground leading-6">
            Demo: messages aren't sent anywhere, but this is where a real
            project would confirm it's on its way.
          </p>
        </div>
        <Button onClick={() => setSent(false)} variant="outline">
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      action="/contact/submit"
      className="relative grid gap-5"
      method="post"
      onSubmit={onSubmit}
      ref={formRef}
    >
      <HoneypotField />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          defaultValue={defaultTopic}
          error={errors.topic}
          label="How can we help?"
          name="topic"
          required
        >
          {CONTACT_TOPICS.map((topic) => (
            <option key={topic.value} value={topic.value}>
              {topic.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          defaultValue={defaultProduct}
          error={errors.product}
          label="Product"
          name="product"
        >
          <option value="">Not product specific</option>
          {products.map((product) => (
            <option key={product.slug} value={product.slug}>
              {product.title}
            </option>
          ))}
        </SelectField>
        <TextField
          autoComplete="name"
          error={errors.name}
          label="Name"
          maxLength={120}
          minLength={2}
          name="name"
          required
        />
        <TextField
          autoComplete="email"
          error={errors.email}
          label="Email"
          maxLength={200}
          name="email"
          required
          type="email"
        />
        <TextField
          autoComplete="organization"
          error={errors.organisation}
          label="Practice or organisation"
          maxLength={160}
          name="organisation"
        />
        <TextField
          autoComplete="tel"
          error={errors.phone}
          label="Phone"
          maxLength={40}
          name="phone"
          type="tel"
        />
      </div>
      <TextAreaField
        error={errors.message}
        label="Message"
        maxLength={2000}
        minLength={10}
        name="message"
        placeholder="Preferred times for a demo, questions, what you're looking for…"
        required
      />
      <CheckboxField
        error={errors.consent}
        label="I agree to being contacted about this message."
        name="consent"
        required
      />
      {failure ? (
        <p className="text-danger text-sm" role="alert">
          {failure}
        </p>
      ) : null}
      <Button
        className="w-full sm:w-auto sm:justify-self-start"
        disabled={pending}
        type="submit"
      >
        {pending ? "Sending…" : "Send message"}
      </Button>
      <p className="text-muted-foreground text-xs leading-5">
        Demo: messages aren't sent anywhere.
      </p>
    </form>
  );
}
