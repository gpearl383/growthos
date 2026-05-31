import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@growthos/ui"],
  serverExternalPackages: [
    "@growthos/db",
    "@electric-sql/pglite",
    "postgres",
  ],
  // Per-function bundle size hardening. Vercel rejects any single serverless
  // function over 250 MB uncompressed, and our analytics / dashboard routes
  // were creeping right up to that line as NFT (Next.js File Tracer) keeps
  // pulling more transitive bytes with each Next.js point release.
  //
  // The exclusions below strip packages that genuinely aren't needed by any
  // route in this app from EVERY function. They are local-dev only, native
  // binaries for platforms we don't deploy to, or test/dev tooling.
  //
  // Heavy packages that ARE used (clerk, drizzle, postgres, ai, inngest,
  // resend, svix) are left alone — they only land in the functions whose
  // routes import them.
  outputFileTracingExcludes: {
    "*": [
      // PGlite (local-dev embedded Postgres) and its drizzle adapter never
      // run in production; we use postgres-js + Supabase there.
      "node_modules/@electric-sql/pglite/**",
      "node_modules/.pnpm/@electric-sql+pglite*/**",
      "node_modules/drizzle-orm/pglite/**",
      "node_modules/.pnpm/drizzle-orm@*/node_modules/drizzle-orm/pglite/**",
      // drizzle-kit is a CLI used for `pnpm db:generate` only; NFT pulls
      // ~10 MB of it into routes because @growthos/db re-exports schema.
      "node_modules/drizzle-kit/**",
      "node_modules/.pnpm/drizzle-kit@*/**",
      // Native sharp binaries for platforms we don't deploy to (Vercel is
      // linux-x64). Saves ~15 MB even though we don't directly depend on
      // sharp — Next.js's image optimizer optionally pulls it in.
      "node_modules/.pnpm/@img+sharp-darwin-*/**",
      "node_modules/.pnpm/@img+sharp-libvips-darwin-*/**",
      "node_modules/.pnpm/@img+sharp-win32-*/**",
      "node_modules/.pnpm/@img+sharp-linuxmusl-*/**",
      // SWC native binaries for non-deploy platforms.
      "node_modules/.pnpm/@next+swc-darwin-*/**",
      "node_modules/.pnpm/@next+swc-win32-*/**",
      "node_modules/.pnpm/@next+swc-linux-x64-musl*/**",
      "node_modules/.pnpm/@next+swc-linux-arm64-*/**",
      // ESBuild native binaries for non-deploy platforms (transitive via
      // several build tools).
      "node_modules/.pnpm/@esbuild+darwin-*/**",
      "node_modules/.pnpm/@esbuild+win32-*/**",
      "node_modules/.pnpm/@esbuild+linux-arm64*/**",
      "node_modules/.pnpm/@esbuild+linux-x64-musl*/**",
      // Rolldown native binaries (vitest pulls this in for non-deploy
      // platforms via dev tooling).
      "node_modules/.pnpm/@rolldown+binding-darwin-*/**",
      "node_modules/.pnpm/@rolldown+binding-win32-*/**",
      "node_modules/.pnpm/@rolldown+binding-linux-arm64*/**",
      "node_modules/.pnpm/@rolldown+binding-linux-x64-musl*/**",
      // lightningcss native binaries for non-deploy platforms.
      "node_modules/.pnpm/lightningcss-darwin-*/**",
      "node_modules/.pnpm/lightningcss-win32-*/**",
      "node_modules/.pnpm/lightningcss-linux-arm64-*/**",
      "node_modules/.pnpm/lightningcss-linux-x64-musl*/**",
      // Tests + their runtime are dev-only.
      "node_modules/vitest/**",
      "node_modules/.pnpm/vitest@*/**",
      "node_modules/@vitest/**",
      "node_modules/.pnpm/@vitest+*/**",
    ],
  },
};

export default nextConfig;
