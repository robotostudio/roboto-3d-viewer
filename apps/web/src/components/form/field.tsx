import { cn } from "@workspace/tailwind-config/utils";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const CONTROL =
  "w-full rounded-none border border-border bg-background px-3 text-base text-foreground leading-6 outline-none transition-colors duration-150 placeholder:text-muted-foreground hover:border-foreground/40 focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-foreground aria-invalid:border-danger aria-invalid:ring-danger";

const LABEL =
  "font-mono text-muted-foreground text-xs uppercase leading-4 tracking-[0.24px]";

interface FieldProps {
  /** Matches the control's name; also builds the label and error ids. */
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

function FieldShell({
  name,
  label,
  required,
  error,
  hint,
  className,
  children,
}: Readonly<FieldProps & { children: ReactNode }>) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className={LABEL} htmlFor={`field-${name}`}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-foreground">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-danger text-sm leading-5" id={`field-${name}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p
          className="text-muted-foreground text-sm leading-5"
          id={`field-${name}-hint`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (name: string, error?: string, hint?: string) =>
  error ? `field-${name}-error` : hint ? `field-${name}-hint` : undefined;

export function TextField({
  name,
  label,
  required,
  error,
  hint,
  className,
  ...input
}: Readonly<FieldProps & InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <FieldShell {...{ name, label, required, error, hint, className }}>
      <input
        aria-describedby={describedBy(name, error, hint)}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, "h-12")}
        id={`field-${name}`}
        name={name}
        required={required}
        {...input}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  label,
  required,
  error,
  hint,
  className,
  ...textarea
}: Readonly<FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  return (
    <FieldShell {...{ name, label, required, error, hint, className }}>
      <textarea
        aria-describedby={describedBy(name, error, hint)}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, "min-h-32 resize-y py-3")}
        id={`field-${name}`}
        name={name}
        required={required}
        {...textarea}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  required,
  error,
  hint,
  className,
  children,
  ...select
}: Readonly<
  FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }
>) {
  return (
    <FieldShell {...{ name, label, required, error, hint, className }}>
      <div className="relative">
        <select
          aria-describedby={describedBy(name, error, hint)}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL, "h-12 appearance-none pr-10")}
          id={`field-${name}`}
          name={name}
          required={required}
          {...select}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 w-3 -translate-y-1/2 text-muted-foreground"
          viewBox="0 0 12 8"
        >
          <path
            d="M1 1.5 6 6.5l5-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </div>
    </FieldShell>
  );
}

export function CheckboxField({
  name,
  label,
  error,
  className,
  ...input
}: Readonly<
  Omit<FieldProps, "hint" | "required"> &
    Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        className="flex cursor-pointer items-start gap-3 text-sm leading-5"
        htmlFor={`field-${name}`}
      >
        <input
          aria-describedby={error ? `field-${name}-error` : undefined}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-none accent-foreground"
          id={`field-${name}`}
          name={name}
          type="checkbox"
          {...input}
        />
        <span>{label}</span>
      </label>
      {error ? (
        <p className="text-danger text-sm leading-5" id={`field-${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Hidden from people and assistive tech; bots that fill every field fill
 * this one, and the server quietly drops their submission.
 */
export function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      className="absolute -left-[9999px] h-0 overflow-hidden"
    >
      <label htmlFor="field-website">Website</label>
      <input
        autoComplete="off"
        id="field-website"
        name="website"
        tabIndex={-1}
        type="text"
      />
    </div>
  );
}
