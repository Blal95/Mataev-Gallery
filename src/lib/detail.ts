import { cache } from "react"
import type { SqlDb } from "./sqldb"
import { listPhotos, getPhoto } from "./photos"
import { rowToDTO } from "./serialize"
import type { PhotoDTO } from "@/types/photo"

export const getDetail = cache(async (db: SqlDb, cdn: string, idOrSlug: string): Promise<{
  photo: PhotoDTO; neighbours: PhotoDTO[]; index: number; total: number
} | null> => {
  const all = (await listPhotos(db, {})).map(({ row, tags }) => rowToDTO(row, tags, cdn))
  const index = all.findIndex((p) => p.id === idOrSlug || p.slug === idOrSlug)
  if (index < 0) return null
  return { photo: all[index], neighbours: all, index, total: all.length }
})

export const getPhotoDTO = cache(async (db: SqlDb, cdn: string, idOrSlug: string): Promise<PhotoDTO | null> => {
  const found = await getPhoto(db, idOrSlug)
  return found ? rowToDTO(found.row, found.tags, cdn) : null
})
