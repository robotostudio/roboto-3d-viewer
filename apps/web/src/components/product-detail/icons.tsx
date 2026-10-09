/**
 * Product page icons from the Paper "Product page" wireframe (Material
 * Symbols shapes), drawn in currentColor. Decorative: each sits by a label.
 */
type IconProps = { className?: string };

export function FileIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 16 20">
      <path
        d="M4.000 16.000L12.000 16.000L12.000 14.000L4.000 14.000L4.000 16.000ZM4.000 12.000L12.000 12.000L12.000 10.000L4.000 10.000L4.000 12.000ZM2.000 20.000C1.450 20.000 0.979 19.804 0.587 19.413C0.196 19.021 0.000 18.550 0.000 18.000L0.000 2.000C0.000 1.450 0.196 0.979 0.587 0.587C0.979 0.196 1.450 0.000 2.000 0.000L10.000 0.000L16.000 6.000L16.000 18.000C16.000 18.550 15.804 19.021 15.413 19.413C15.021 19.804 14.550 20.000 14.000 20.000L2.000 20.000ZM9.000 7.000L9.000 2.000L2.000 2.000L2.000 18.000L14.000 18.000L14.000 7.000L9.000 7.000Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 16 16">
      <path
        d="M8.000 12.000L3.000 7.000L4.400 5.550L7.000 8.150L7.000 0.000L9.000 0.000L9.000 8.150L11.600 5.550L13.000 7.000L8.000 12.000ZM2.000 16.000C1.450 16.000 0.979 15.804 0.587 15.413C0.196 15.021 0.000 14.550 0.000 14.000L0.000 11.000L2.000 11.000L2.000 14.000L14.000 14.000L14.000 11.000L16.000 11.000L16.000 14.000C16.000 14.550 15.804 15.021 15.413 15.413C15.021 15.804 14.550 16.000 14.000 16.000L2.000 16.000Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** The version select's caret. */
export function CaretIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 12 8">
      <path
        d="M1 1.5 6 6.5l5-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
