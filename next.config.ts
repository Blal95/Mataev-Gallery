import type { NextConfig } from "next"
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

// Enable Cloudflare bindings (D1, R2, env) in `next dev` so getCloudflareContext() works.
// `remote = true` on the D1 binding in wrangler.toml points local `next dev`
// at the live Cloudflare D1 (real photos), not an empty local replica.
// Must run before the config is evaluated.
void initOpenNextCloudflareForDev()

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Images are pre-sized at upload and served from cdn.gallery.mataev.no,
  // so the runtime optimizer is disabled (cheaper on Workers).
  images: { unoptimized: true },
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
