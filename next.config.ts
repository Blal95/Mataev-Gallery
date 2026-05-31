import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Images are pre-sized at upload and served from cdn.gallery.mataev.no,
  // so the runtime optimizer is disabled (cheaper on Workers).
  images: { unoptimized: true },
}

export default nextConfig

// Enable Cloudflare bindings in `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"
// `remote = true` on the D1 binding in wrangler.toml points local `next dev`
// at the live Cloudflare D1 (real photos), not an empty local replica.
void initOpenNextCloudflareForDev()
