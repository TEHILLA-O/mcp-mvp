import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["postgres", "exceljs"],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
