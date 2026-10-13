// ARAMYA iconography — one consistent rounded-outline family (Design System §19).
// Stroke-based, 24px grid, rounded caps, never mixed with filled/duotone styles.

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function LocationIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

export function VerifiedIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 2.5 2.2 1.6 2.7-.2.9 2.5 2.2 1.6-1 2.6 1 2.6-2.2 1.6-.9 2.5-2.7-.2L12 20.3l-2.2-1.6-2.7.2-.9-2.5-2.2-1.6 1-2.6-1-2.6L6.2 6.4l.9-2.5 2.7.2Z" />
      <path d="m8.8 11.6 2.2 2.2 4.2-4.4" />
    </svg>
  );
}

export function CrosshairIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 10.5 12 4l8 6.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8.5Z" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.75 20c.9-3.4 3.8-5.25 7.25-5.25S18.35 16.6 19.25 20" />
    </svg>
  );
}

export function TrainerIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20.5c.7-3.3 3.3-5 6.5-5s5.8 1.7 6.5 5" />
      <path d="M17.5 3.5 19 5l2.5-2.5" />
    </svg>
  );
}

// Service marks — abstract movement/balance forms (no lotus, dumbbell, pulse or house clichés)
export function YogaIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5v6" />
      <path d="M12 9.5c-3.4 0-6 2.2-6 5.2 0 1.7 1.2 2.8 2.7 2.8 1.7 0 2.7-1.1 3.3-2.6.6 1.5 1.6 2.6 3.3 2.6 1.5 0 2.7-1.1 2.7-2.8 0-3-2.6-5.2-6-5.2Z" />
      <path d="M5 20.5h14" />
    </svg>
  );
}

export function FitnessIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 19.5h3.5V13H4v6.5ZM10.25 19.5h3.5V9h-3.5v10.5ZM16.5 19.5H20V4.5h-3.5v15Z" />
    </svg>
  );
}

export function MobilityIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2" />
      <path d="M19.5 12a7.5 7.5 0 0 1-12.9 5.2" />
      <path d="M17.8 3.4v3.4h-3.4M6.2 20.6v-3.4h3.4" />
    </svg>
  );
}

export function WeightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 19.5h15" />
      <path d="M4.5 19.5 9 8l4 6.5" />
      <path d="M13 14.5 17 8l2.5 11.5" />
      <path d="M7.4 12.5h9.2" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h15" />
      <path d="m13.5 6.5 5.5 5.5-5.5 5.5" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9.5 6 6 6-6 6" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 4Z" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 3.2.8 4.7 1.6 5.6.4.5.1 1.4-.6 1.4H5.5c-.7 0-1-.9-.6-1.4.8-.9 1.6-2.4 1.6-5.6Z" />
      <path d="M10 20.5a2.3 2.3 0 0 0 4 0" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5M12 16.2h.01" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 3.8h10a2 2 0 0 1 2 2v12.4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z" />
      <path d="M10.5 17.5h3" />
    </svg>
  );
}

export function PaymentIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
      <path d="M3.5 10h17M7 14.5h3" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10v3Z" />
      <path d="m14.5 6.5 3 3" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 19 6v6c0 4-3 7-7 8.5C8 19 5 16 5 12V6l7-2.5Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.5 3.5h7L18 8v12.5H6.5V3.5Z" />
      <path d="M13.5 3.5V8H18M9.5 12.5h5M9.5 16h5" />
    </svg>
  );
}

export const SERVICE_ICONS = {
  yoga: YogaIcon,
  fitness: FitnessIcon,
  mobility: MobilityIcon,
  weight: WeightIcon,
} as const;
