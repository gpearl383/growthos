import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@growthos/ui"],
  serverExternalPackages: [
    "@growthos/db",
    "@electric-sql/pglite",
    "postgres",
  ],
  // PGlite is local-dev only. Without this, Vercel's NFT tracer pulls
  // 16+ MB of pglite + drizzle-orm/pglite into every serverless function
  // and the bundle overruns the 250 MB function size limit.
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@electric-sql/pglite/**",
      "node_modules/.pnpm/@electric-sql+pglite*/**",
      "node_modules/drizzle-orm/pglite/**",
      "node_modules/.pnpm/drizzle-orm@*/node_modules/drizzle-orm/pglite/**",
    ],
  },
};

export default nextConfig;
