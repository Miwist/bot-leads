import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  /** Корень монорепозитория (несколько package-lock). */
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
