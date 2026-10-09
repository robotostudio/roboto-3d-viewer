"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@workspace/tailwind-config/utils";
import { Minus, Plus } from "lucide-react";

import { MAX_QUANTITY } from "./enquiry-context";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** What's being counted, for screen readers, e.g. "TRC-50DX". */
  label: string;
  size?: "default" | "sm";
  className?: string;
}

/**
 * −/value/+ control, 1 to 99. The number rolls to its new value (NumberFlow,
 * as in the slingshot-bio cart); reduced motion gets a plain swap.
 */
export function QuantityStepper({
  value,
  onChange,
  label,
  size = "default",
  className,
}: Readonly<QuantityStepperProps>) {
  const cell = size === "sm" ? "size-9" : "size-12";
  const button = cn(
    "grid place-items-center text-foreground transition-colors duration-150 hover:bg-card disabled:pointer-events-none disabled:opacity-35 focus-ring-inset",
    cell
  );

  return (
    <fieldset
      aria-label={`Quantity of ${label}`}
      className={cn(
        "inline-flex w-max min-w-0 shrink-0 items-stretch self-start border border-border",
        className
      )}
    >
      <button
        aria-label={`Decrease quantity of ${label}`}
        className={button}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        type="button"
      >
        <Minus className="size-3.5" />
      </button>
      <output
        aria-live="polite"
        className={cn(
          "grid w-10 place-items-center border-border border-x font-mono text-sm tabular-nums",
          size === "sm" ? "h-9" : "h-12"
        )}
      >
        <NumberFlow aria-hidden="true" respectMotionPreference value={value} />
        <span className="sr-only">{value}</span>
      </output>
      <button
        aria-label={`Increase quantity of ${label}`}
        className={button}
        disabled={value >= MAX_QUANTITY}
        onClick={() => onChange(value + 1)}
        type="button"
      >
        <Plus className="size-3.5" />
      </button>
    </fieldset>
  );
}
