/**
 * Viewer icons, drawn in currentColor. All decorative: every use sits next to
 * a label or inside a labelled button.
 */
type IconProps = { className?: string };

/** "View in 3D": a cube inside corner brackets. */
export function View3dIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M9.000 17.475L4.000 14.600C3.683 14.417 3.438 14.175 3.263 13.875C3.088 13.575 3.000 13.242 3.000 12.875L3.000 7.125C3.000 6.758 3.088 6.425 3.263 6.125C3.438 5.825 3.683 5.583 4.000 5.400L9.000 2.525C9.317 2.342 9.650 2.250 10.000 2.250C10.350 2.250 10.683 2.342 11.000 2.525L16.000 5.400C16.317 5.583 16.562 5.825 16.737 6.125C16.912 6.425 17.000 6.758 17.000 7.125L17.000 12.875C17.000 13.242 16.912 13.575 16.737 13.875C16.562 14.175 16.317 14.417 16.000 14.600L11.000 17.475C10.683 17.658 10.350 17.750 10.000 17.750C9.650 17.750 9.317 17.658 9.000 17.475ZM9.000 15.175L9.000 10.575L5.000 8.250L5.000 12.875L9.000 15.175ZM11.000 15.175L15.000 12.875L15.000 8.250L11.000 10.575L11.000 15.175ZM0.000 5.000L0.000 2.000C0.000 1.450 0.196 0.979 0.587 0.587C0.979 0.196 1.450 0.000 2.000 0.000L5.000 0.000L5.000 2.000L2.000 2.000L2.000 5.000L0.000 5.000ZM5.000 20.000L2.000 20.000C1.450 20.000 0.979 19.804 0.587 19.413C0.196 19.021 0.000 18.550 0.000 18.000L0.000 15.000L2.000 15.000L2.000 18.000L5.000 18.000L5.000 20.000ZM15.000 20.000L15.000 18.000L18.000 18.000L18.000 15.000L20.000 15.000L20.000 18.000C20.000 18.550 19.804 19.021 19.413 19.413C19.021 19.804 18.550 20.000 18.000 20.000L15.000 20.000ZM18.000 5.000L18.000 2.000L15.000 2.000L15.000 0.000L18.000 0.000C18.550 0.000 19.021 0.196 19.413 0.587C19.804 0.979 20.000 1.450 20.000 2.000L20.000 5.000L18.000 5.000ZM10.000 8.850L13.950 6.525L10.000 4.250L6.050 6.525L10.000 8.850Z"
      />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        d="M3 3l10 10M13 3 3 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Exploded view: a box with its parts pulled apart. */
export function ExplodeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect x="7" y="7" width="6" height="6" />
      <path d="M7 3h6M3 7v6M17 7v6M7 17h6" />
      <path d="M1.5 1.5l3 3M18.5 1.5l-3 3M1.5 18.5l3-3M18.5 18.5l-3-3" />
    </svg>
  );
}

/** Reset view: four corners framing the model. */
export function FitIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

/** Zoom out. */
export function MinusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path d="M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Zoom in. */
export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        d="M8 2.5v11M2.5 8h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
