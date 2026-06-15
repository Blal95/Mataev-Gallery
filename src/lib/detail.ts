import { cache } from "react"
import type { SqlDb } from "./sqldb"
import { listPhotos, getPhoto } from "./photos"
import { rowToDTO } from "./serialize"
import { cdnBase } from "./env"
import type { PhotoDTO } from "@/types/photo"

export const getDetail = cache(async (db: SqlDb, idOrSlug: string): Promise<{
  photo: PhotoDTO; prev: PhotoDTO | null; next: PhotoDTO | null; index: number; total: number
} | null> => {
  const base = await cdnBase()
  const all = (await listPhotos(db, { homeOnly: false })).map(({ row, tags }) => rowToDTO(row, tags, base))
  const index = all.findIndex((p) => p.id === idOrSlug || p.slug === idOrSlug)
  if (index < 0) return null
  const countRow = await db.prepare("SELECT COUNT(*) AS n FROM comments WHERE photo_id = ?")
    .bind(all[index].id).first<{ n: number }>()
  const photo = { ...all[index], commentCount: countRow?.n ?? 0 }
  // Only prev/next ship to the client — sending the whole gallery as props
  // made every detail page payload grow with the photo count.
  return {
    photo,
    prev: all[index - 1] ?? null,
    next: all[index + 1] ?? null,
    index,
    total: all.length,
  }
})

export const getPhotoDTO = cache(async (db: SqlDb, idOrSlug: string): Promise<PhotoDTO | null> => {
  const found = await getPhoto(db, idOrSlug)
  return found ? rowToDTO(found.row, found.tags, await cdnBase()) : null
})
