import { getCloudflareContext } from "@opennextjs/cloudflare"

export function cf() {
  return getCloudflareContext().env
}

export function cdnBase(): string {
  return cf().NEXT_PUBLIC_CDN_BASE
}

export function allowedOrigins(): string[] {
  return (cf().ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
}
