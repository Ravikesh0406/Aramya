// ARAMYA logo system — wordmark-first with an independent movement mark.
// Uses only approved logo colors (Design System §5).
// Primary: [MARK] ARAMYA · Variants: wordmark-only, reversed, monochrome.

import Link from "next/link";

type LogoTone = "forest" | "ivory";

const WORDMARK_COLOR: Record<LogoTone, string> = {
  forest: "text-forest-900",
  ivory: "text-ivory-50",
};

export function LogoMark({
  className = "",
  accent = "#B86F52",
  stroke = "currentColor",
}: {
  className?: string;
  accent?: string;
  stroke?: string;
}) {
  // Custom "A" built from two rising strokes — progression, balance, movement.
  return (
    <svg
      viewBox="0 0 32 32"
      width="32"
      height="32"
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path
        d="M5.5 26 16 5.5 26.5 26"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6 19.4h10.8"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  tone = "forest",
  href = "/",
  size = "md",
  withMark = true,
  className = "",
}: {
  tone?: LogoTone;
  href?: string;
  size?: "sm" | "md";
  withMark?: boolean;
  className?: string;
}) {
  const textColor = WORDMARK_COLOR[tone];
  const markColor = tone === "ivory" ? "text-ivory-50" : "text-forest-900";
  const markStroke = tone === "ivory" ? "#F7F3EA" : "#183C32";
  const label = size === "sm" ? "text-[17px]" : "text-[19px]";

  return (
    <Link
      href={href}
      aria-label="ARAMYA — home"
      className={`group inline-flex items-center gap-2.5 ${className}`}
    >
      {withMark ? (
        <span className={markColor}>
          <LogoMark stroke={markStroke} className="h-7 w-7 md:h-8 md:w-8" />
        </span>
      ) : null}
      <span
        className={`${label} font-extrabold tracking-[0.18em] ${textColor} transition-opacity duration-200 ease-out group-hover:opacity-80`}
      >
        ARAMYA
      </span>
    </Link>
  );
}
