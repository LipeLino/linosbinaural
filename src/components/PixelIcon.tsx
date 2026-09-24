import type { CSSProperties } from "react";
const shapes: Record<string, string> = {
  rain: "M6 3h9v3h3v3h3v6H3V9h3V3Zm0 14h3v4H6Zm6 0h3v4h-3Zm6 0h3v4h-3Z",
  ocean: "M2 9h3V6h6v3h3v3h4V9h4v6H2Zm0 9h5v2h5v-2h5v2h5v3H2Z",
  cafe: "M4 8h13v2h5v9h-5v3H4Zm13 5v3h2v-3ZM5 1h2v4H5Zm6 1h2v4h-2Z",
  forest:
    "M6 1h3v3h3v3h3v3H1V7h3V4h2Zm0 10h3v3h4v3H2v-3h4Zm0 6h3v6H6Zm10-9h3v3h3v3h2v3H13v-3h3Zm0 9h3v6h-3Z",
  fireplace: "M12 1h3v7h3V5h3v13h-3v3H6v-3H3V9h3v3h3V5h3Zm-1 12v7h4v-7Z",
  white:
    "M2 2h3v3H2Zm7 0h3v3H9Zm9 0h3v3h-3ZM5 8h3v3H5Zm9 0h3v3h-3ZM1 14h3v3H1Zm8 0h3v3H9Zm10 0h3v3h-3ZM5 20h3v3H5Zm9 0h3v3h-3Z",
  pink: "M1 5h3v4h3v7h3V3h3v18h3V9h3v4h3v3h-6v8H9v-5H4v-7H1Z",
  brown: "M1 14h4V8h4V4h4v4h4v6h6v4h-8v-6h-4V8H9v4H7v6H1Z",
  play: "M7 3h3v3h4v3h4v3h3v2h-3v3h-4v3h-4v3H7Z",
  pause: "M5 4h5v17H5Zm9 0h5v17h-5Z",
  stop: "M5 5h15v15H5Z",
  headphones: "M7 2h10v3h4v4h2v12h-7V10h4V8h-3V5H7v3H4v2h4v11H1V9h2V5h4Z",
  volume: "M3 9h5V6h4V3h3v20h-3v-3H8v-3H3Zm15-3h3v3h2v8h-2v3h-3v-3h2V9h-2Z",
  sun: "M10 1h3v4h-3Zm0 19h3v4h-3ZM1 10h4v3H1Zm19 0h4v3h-4ZM5 5h3v3H5Zm12 0h3v3h-3ZM5 17h3v3H5Zm12 0h3v3h-3ZM9 7h6v2h2v6h-2v2H9v-2H7V9h2Z",
  moon: "M11 1h5v3h-4v4h-2v6h3v3h7v-3h3v6h-4v3H8v-3H4v-4H1V8h3V4h7Z",
  save: "M3 2h16v3h3v18H3Zm4 2v7h10V4Zm0 11v6h11v-6Z",
  record:
    "M7 1h10v3h4v4h3v9h-3v4h-4v3H7v-3H3v-4H0V8h3V4h4Zm3 7v3H7v4h3v3h5v-3h3v-4h-3V8Z",
  clock: "M7 1h10v3h4v4h3v9h-3v4h-4v3H7v-3H3v-4H0V8h3V4h4Zm4 4v9h7v-3h-4V5Z",
  user: "M8 1h8v3h3v8h-3v3H8v-3H5V4h3ZM5 17h14v3h3v4H2v-4h3Z",
  arrow: "M14 3h3v3h3v3h3v6h-3v3h-3v3h-3v-6H1V9h13Z",
  close:
    "M3 3h4v4h3v3h4V7h3V3h4v4h-4v3h-3v4h3v3h4v4h-4v-4h-3v-3h-4v3H7v4H3v-4h4v-3h3v-4H7V7H3Z",
};
export function PixelIcon({
  name,
  size = 20,
  className = "",
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
      style={style}
    >
      <path d={shapes[name] || shapes.record} />
    </svg>
  );
}
