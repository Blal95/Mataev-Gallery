import type { SqlDb } from "./sqldb"
import type { PhotosResponse } from "@/types/photo"
import { listPhotos, listTagCounts } from "./photos"
import { rowToDTO } from "./serialize"

export async function buildPhotosResponse(db: SqlDb, cdn: string, opts: { tag?: string }): Promise<PhotosResponse> {
  const [list, tags] = await Promise.all([listPhotos(db, opts), listTagCounts(db)])
  return { photos: list.map(({ row, tags }) => rowToDTO(row, tags, cdn)), tags }
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

export const PUBLIC_CACHE = "public, s-maxage=300, stale-while-revalidate=86400"
