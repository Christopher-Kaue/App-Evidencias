import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Pasta do app Next (evita aviso com package-lock na raiz do monorepo + em web/)
    root: webRoot
  }
};

export default nextConfig;
