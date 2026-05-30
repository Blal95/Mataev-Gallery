import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Images are pre-sized at upload and served from cdn.gallery.mataev.no,
  // so the runtime optimizer is disabled (cheaper on Workers).
  images: { unoptimized: true },
}

export default nextConfig

// Enable Cloudflare bindings in `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"
void initOpenNextCloudflareForDev()
