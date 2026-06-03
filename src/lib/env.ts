import { getCloudflareContext } from "@opennextjs/cloudflare"

export async function cf() {
  return (await getCloudflareContext({ async: true })).env
}

export async function cdnBase(): Promise<string> {
  return (await cf()).NEXT_PUBLIC_CDN_BASE
}

export async function allowedOrigins(): Promise<string[]> {
  return ((await cf()).ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
}
