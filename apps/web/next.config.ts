import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@growthos/ui"],
  serverExternalPackages: [
    "@growthos/db",
    "@electric-sql/pglite",
    "postgres",
  ],
};

export default nextConfig;
