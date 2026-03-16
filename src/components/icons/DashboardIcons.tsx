import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function CalendarIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="3"
        y="4.5"
        width="18"
        height="16"
        rx="3"
        className="fill-none stroke-current"
        strokeWidth="1.5"
      />
      <path
        d="M8 3v4M16 3v4"
        className="fill-none stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 9.5h18"
        className="fill-none stroke-current"
        strokeWidth="1.5"
      />
      <rect
        x="8"
        y="12"
        width="4"
        height="4"
        rx="1"
        className="fill-current"
      />
    </svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M7 3.5 8.4 7.6 12.5 9 8.4 10.4 7 14.5 5.6 10.4 1.5 9 5.6 7.6 7 3.5Z"
        className="fill-current"
      />
      <path
        d="M17 5.5 17.8 7.7 20 8.5 17.8 9.3 17 11.5 16.2 9.3 14 8.5 16.2 7.7 17 5.5Z"
        className="fill-current opacity-80"
      />
      <path
        d="M16 13.5 16.6 15.1 18.2 15.7 16.6 16.3 16 17.9 15.4 16.3 13.8 15.7 15.4 15.1 16 13.5Z"
        className="fill-current opacity-60"
      />
    </svg>
  );
}

export function FireIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 3.5c.8 1.8.7 3.5-.2 4.9-.7-1.1-1.9-2.2-3.3-3.2-.3 2-1.3 3.2-2.2 4.2C5 10.6 4.5 11.7 4.5 13a7.5 7.5 0 0 0 15 0c0-3.2-2-5.7-4.1-7.5-.1 1.3-.5 2.4-1.4 3.4-.4-2-1.3-3.7-2-5.4Z"
        className="fill-current"
      />
      <path
        d="M13 13.3c-.5.8-.9 1.3-1.5 1.8-.5-.6-1.1-1.2-1.7-1.8-.5.8-.8 1.6-.8 2.5a3.5 3.5 0 1 0 7 0c0-1.2-.6-2.2-1.5-3.1-.4.3-.9.4-1.5.6Z"
        className="fill-white/70"
      />
    </svg>
  );
}

export function ConfettiIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M4 18.5 8.5 4.5 19.5 15.5 4 18.5Z"
        className="fill-current"
      />
      <path
        d="M10 5c.4-.8 1.4-2 3-2 1.7 0 2.6 1.1 3 2"
        className="fill-none stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13 7.5c.3-.5.9-1.3 2-1.3s1.7.8 2 1.3"
        className="fill-none stroke-current"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="9.5" cy="11.5" r="0.7" className="fill-white/80" />
      <circle cx="12.5" cy="13.5" r="0.7" className="fill-white/80" />
      <circle cx="15" cy="10.5" r="0.7" className="fill-white/80" />
    </svg>
  );
}

export function TicketIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M5.5 6.5h13a1.5 1.5 0 0 1 1.5 1.5v3a2.5 2.5 0 0 0 0 5v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V16a2.5 2.5 0 0 0 0-5V8A1.5 1.5 0 0 1 5.5 6.5Z"
        className="fill-current"
      />
      <path
        d="M13.5 7.5v9"
        className="fill-none stroke-white/80"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="11" r="0.9" className="fill-white/85" />
      <circle cx="9" cy="14.5" r="0.9" className="fill-white/85" />
    </svg>
  );
}

