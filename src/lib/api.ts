import type { SqlDb } from "./sqldb"
import type { PhotosResponse } from "@/types/photo"
import { listPhotos, listTagCounts } from "./photos"
import { rowToDTO } from "./serialize"

export async function buildPhotosResponse(
  db: SqlDb,
  opts: { tag?: string; limit?: number; offset?: number; all?: boolean },
  cdnBase: string,
): Promise<PhotosResponse> {
  const [list, tags] = await Promise.all([listPhotos(db, opts), listTagCounts(db)])
  const photos = list.map(({ row, tags }) => rowToDTO(row, tags, cdnBase))
  const nextOffset =
    opts.limit != null
      ? photos.length === opts.limit
        ? (opts.offset ?? 0) + opts.limit
        : null
      : null
  return { photos, tags, nextOffset }
}

export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const h: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
  if (origin && allowed.includes(origin)) h["Access-Control-Allow-Origin"] = origin
  return h
}

export const PUBLIC_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400"

/**
 * CSRF guard for mutating routes. Sec-Fetch-Site covers modern browsers; the
 * Origin/Host comparison catches clients that omit it.
 */
export function sameOriginGuard(req: Request): boolean {
  if (req.headers.get("Sec-Fetch-Site") === "cross-site") return false
  const origin = req.headers.get("Origin")
  const host = req.headers.get("Host")
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return false
    } catch {
      return false
    }
  }
  return true
}
