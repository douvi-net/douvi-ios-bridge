import type { CSSProperties } from "react";

const paths = {
  bridge: "M3 18V6m18 12V6M3 9c5 6 13 6 18 0M7 12v6m5-4v4m5-6v6M2 18h20",
  folder: "M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3V7Z",
  build: "m14 6 4 4M4 20l6-6m4-10a6 6 0 0 0-7 8l-4 4a2 2 0 0 0 3 3l4-4a6 6 0 0 0 8-7l-4 3-3-3 3-4Z",
  terminal: "m5 7 5 5-5 5m8 0h6",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6",
  phone: "M7 2h10v20H7V2Zm4 17h2",
  plane: "m3 11 18-8-8 18-3-8-7-2Zm7 2 6-6",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-3-5h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  down: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  check: "m5 12 4 4L19 6",
  plus: "M12 4v16M4 12h16",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1",
  moon: "M20 14A8 8 0 0 1 10 4 9 9 0 1 0 20 14Z",
} as const;
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: keyof typeof paths;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
