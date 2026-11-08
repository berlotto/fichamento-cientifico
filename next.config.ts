import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // unpdf/pdf.js roda só no worker (Node); não empacotar.
  serverExternalPackages: ["unpdf"],
  async redirects() {
    return [{ source: "/", destination: "/projects", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
