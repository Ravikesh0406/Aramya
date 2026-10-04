// ARAMYA shared UI primitives — Design System §6 (Core UI) and §4.
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { CheckIcon } from "@/components/Icons";
import { TRIAL } from "@/lib/data";

/* ---------------------------------------------------------------- Container */

export function Container({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1280px] px-6 md:px-8 ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------- Button */

type ButtonVariant = "primary" | "secondary" | "accent" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-forest-900 text-white hover:bg-forest-800 active:bg-forest-950 shadow-sm",
  secondary:
    "bg-white text-forest-900 border border-forest-900/25 hover:border-forest-900/50 hover:shadow-sm",
  accent:
    "bg-terracotta-500 text-white hover:bg-terracotta-600 active:bg-terracotta-600 shadow-sm",
  ghost:
    "bg-transparent text-forest-900 hover:bg-forest-900/8 active:bg-forest-900/12",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  // 44–48px height, 10px radius (Design System §6)
  sm: "h-11 px-5 text-sm",
  md: "h-12 px-6 text-[16px]",
  lg: "h-14 px-7 text-[16px]",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}

type LinkButtonProps = {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
};

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ariaLabel,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------- Overline */

export function Overline({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`t-overline text-terracotta-500 ${className}`}>{children}</p>
  );
}

/* ------------------------------------------------------------ SectionHeading */

export function SectionHeading({
  overline,
  title,
  description,
  align = "left",
  tone = "dark",
  className = "",
}: {
  overline?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
}) {
  const centered = align === "center" ? "items-center text-center" : "";
  const titleColor = tone === "light" ? "text-ivory-50" : "text-charcoal-900";
  const descColor = tone === "light" ? "text-ivory-50/75" : "text-muted-600";
  return (
    <div className={`flex flex-col gap-3 ${centered} ${className}`}>
      {overline ? (
        <Overline className={tone === "light" ? "text-sage-500" : ""}>
          {overline}
        </Overline>
      ) : null}
      <h2 className={`t-h1 max-w-3xl ${titleColor}`}>{title}</h2>
      {description ? (
        <p className={`t-body-lg max-w-2xl ${descColor}`}>{description}</p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- CheckList */

export function CheckList({
  items,
  tone = "dark",
  className = "",
}: {
  items: string[];
  tone?: "dark" | "light";
  className?: string;
}) {
  const textColor = tone === "light" ? "text-ivory-50/85" : "text-charcoal-900";
  const iconColor = tone === "light" ? "text-sage-500" : "text-forest-900";
  return (
    <ul className={`flex flex-col gap-3 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill ${
              tone === "light"
                ? "bg-ivory-50/15"
                : "bg-forest-900/8"
            } ${iconColor}`}
          >
            <CheckIcon size={13} strokeWidth={2.4} />
          </span>
          <span className={`t-body ${textColor}`}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------- Price helpers */

export function StruckPrice({ className = "" }: { className?: string }) {
  return (
    <span className={`text-muted-600 line-through ${className}`}>{TRIAL.regularPrice}</span>
  );
}

/* -------------------------------------------------------------- StatusBadge */

const STATUS_TONES: Record<string, string> = {
  Completed: "border-success/30 bg-success/10 text-success",
  Confirmed: "border-info/30 bg-info/10 text-info",
  Upcoming: "border-info/30 bg-info/10 text-info",
  "In Progress": "border-info/30 bg-info/10 text-info",
  Accepted: "border-info/30 bg-info/10 text-info",
  Requested: "border-forest-900/20 bg-forest-900/8 text-forest-900",
  "Reschedule Requested": "border-warning/30 bg-warning/10 text-warning",
  Rescheduled: "border-warning/30 bg-warning/10 text-warning",
  Expired: "border-warning/30 bg-warning/10 text-warning",
  Cancelled: "border-error/30 bg-error/10 text-error",
  "No Show": "border-error/30 bg-error/10 text-error",
  Disputed: "border-error/30 bg-error/10 text-error",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? "border-forest-900/20 bg-forest-900/8 text-forest-900";
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-3 py-1 text-caption font-semibold whitespace-nowrap ${tone}`}
    >
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------- Panel */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-forest-900/8 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
