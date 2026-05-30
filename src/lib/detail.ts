import type { SqlDb } from "./sqldb"
import { listPhotos } from "./photos"
import { rowToDTO } from "./serialize"
import type { PhotoDTO } from "@/types/photo"

export async function getDetail(db: SqlDb, cdn: string, idOrSlug: string): Promise<{
  photo: PhotoDTO; neighbours: PhotoDTO[]; index: number; total: number
} | null> {
  const all = (await listPhotos(db, {})).map(({ row, tags }) => rowToDTO(row, tags, cdn))
  const index = all.findIndex((p) => p.id === idOrSlug || p.slug === idOrSlug)
  if (index < 0) return null
  return { photo: all[index], neighbours: all, index, total: all.length }
}
