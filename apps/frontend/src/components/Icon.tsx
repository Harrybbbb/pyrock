import type { ReactNode, SVGProps } from "react";

/**
 * A single stroked icon set, drawn on a 24×24 grid and inheriting `currentColor`.
 * Emoji were doing this job before; they render differently on every platform and
 * can't take the accent colour, so the UI carries its own glyphs instead.
 */
export type IconName =
  | "alert"
  | "bricks"
  | "cement"
  | "chart"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "plus"
  | "refresh"
  | "retry"
  | "sand"
  | "search"
  | "send"
  | "site"
  | "sparkle"
  | "stack"
  | "steel"
  | "trash";

const PATHS: Record<IconName, ReactNode> = {
  alert: (
    <>
      <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4.5M12 17.2h.01" />
    </>
  ),
  bricks: (
    <>
      <path d="M3 5h18v5H3zM3 14h18v5H3z" />
      <path d="M10 5v5M16 14v5" />
    </>
  ),
  cement: (
    <>
      <path d="M7.5 8h9l1.2 12H6.3L7.5 8Z" />
      <path d="M9.5 8V6a2.5 2.5 0 0 1 5 0v2M9.5 14h5" />
    </>
  ),
  chart: (
    <>
      <path d="M3 21h18" />
      <path d="M7 21v-5M12 21V8M17 21v-9" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
      <path d="M20.5 4v5h-5" />
    </>
  ),
  retry: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4v5h5" />
    </>
  ),
  sand: (
    <>
      <path d="M6 3h12M6 21h12" />
      <path d="M8 3v3.5l4 5.5-4 5.5V21M16 3v3.5l-4 5.5 4 5.5V21" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.2-4.2" />
    </>
  ),
  send: <path d="M21.5 2.5 10.8 13.2M21.5 2.5l-6.8 19-3.9-8.3-8.3-3.9 19-6.8Z" />,
  site: (
    <>
      <path d="M4 21V8.6L12 3l8 5.6V21" />
      <path d="M3 21h18M9.5 21v-5.5h5V21" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5 13.9 9 19.5 11l-5.6 2L12 18.5 10.1 13 4.5 11 10.1 9 12 3.5Z" />
      <path d="M18.5 3.5v3M20 5h-3" />
    </>
  ),
  stack: (
    <>
      <path d="M12 3 21 8l-9 5-9-5 9-5Z" />
      <path d="m3 12.5 9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  steel: (
    <>
      <path d="M7 3v18M12 3v18M17 3v18" />
      <path d="M4 8.5h16M4 15.5h16" />
    </>
  ),
  trash: (
    <>
      <path d="M4 6.5h16M9.5 6.5V4h5v2.5" />
      <path d="m6.5 6.5.9 13.1a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9l.9-13.1" />
      <path d="M10.5 10.5v6M13.5 10.5v6" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/** The Pyrock mark — a stylised quarry block, used in the top bar and the empty state. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M16 2.8 28.2 9.6v12.8L16 29.2 3.8 22.4V9.6L16 2.8Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M16 2.8v12.9m0 0L3.8 9.6m12.2 6.1 12.2-6.1M16 15.7v13.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx="16" cy="15.7" r="2.6" fill="currentColor" />
    </svg>
  );
}
