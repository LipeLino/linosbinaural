import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  basePath: "/builds/linosbinaural",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};
export default config;
