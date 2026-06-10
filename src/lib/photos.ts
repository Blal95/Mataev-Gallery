import type { SqlDb } from "@/lib/sqldb"
import type { PhotoRow } from "@/types/photo"

export interface PhotoWithTags { row: PhotoRow; tags: string[] }

const COLS =
  "id,slug,caption,taken_at,created_at,width,height,aspect,bytes,format,color_space," +
  "camera_make,camera_model,lens_model,focal_length,f_number,exposure_time,iso," +
  "gps_lat,gps_lon,gps_alt,place,country,country_code,thumbhash," +
  "r2_original,r2_large,r2_thumb,published,sort_index,media_type,duration,views"

async function tagsFor(db: SqlDb, ids: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (ids.length === 0) return map
  const placeholders = ids.map(() => "?").join(",")
  const { results } = await db
    .prepare(
      `SELECT pt.photo_id AS pid, t.name AS name FROM photo_tags pt
       JOIN tags t ON t.id = pt.tag_id WHERE pt.photo_id IN (${placeholders}) ORDER BY t.name`,
    )
    .bind(...ids)
    .all<{ pid: string; name: string }>()
  for (const r of results) {
    const arr = map.get(r.pid) ?? []
    arr.push(r.name)
    map.set(r.pid, arr)
  }
  return map
}

export async function insertPhoto(db: SqlDb, row: PhotoRow, tags: string[]): Promise<void> {
  await db
    .prepare(
      `INSERT INTO photos (${COLS}) VALUES (${COLS.split(",").map(() => "?").join(",")})`,
    )
    .bind(
      row.id, row.slug, row.caption, row.taken_at, row.created_at, row.width, row.height, row.aspect,
      row.bytes, row.format, row.color_space, row.camera_make, row.camera_model, row.lens_model,
      row.focal_length, row.f_number, row.exposure_time, row.iso, row.gps_lat, row.gps_lon, row.gps_alt,
      row.place, row.country, row.country_code, row.thumbhash, row.r2_original, row.r2_large, row.r2_thumb,
      row.published, row.sort_index, row.media_type, row.duration, row.views,
    )
    .run()
  await upsertTags(db, row.id, tags)
}

export async function listPhotos(
  db: SqlDb,
  opts: { tag?: string; limit?: number; offset?: number },
): Promise<PhotoWithTags[]> {
  const off = opts.offset ?? 0
  const pagination = opts.limit != null ? ` LIMIT ? OFFSET ?` : ""
  const bindsExtra: unknown[] = opts.limit != null ? [opts.limit, off] : []

  let rows: PhotoRow[]
  if (opts.tag) {
    const r = await db
      .prepare(
        `SELECT ${COLS.split(",").map((c) => "p." + c).join(",")} FROM photos p
         JOIN photo_tags pt ON pt.photo_id = p.id JOIN tags t ON t.id = pt.tag_id
         WHERE t.name = ? AND p.published = 1 ORDER BY p.taken_at DESC, p.created_at DESC${pagination}`,
      )
      .bind(opts.tag, ...bindsExtra)
      .all<PhotoRow>()
    rows = r.results
  } else {
    const r = await db
      .prepare(
        `SELECT ${COLS} FROM photos WHERE published = 1 ORDER BY taken_at DESC, created_at DESC${pagination}`,
      )
      .bind(...bindsExtra)
      .all<PhotoRow>()
    rows = r.results
  }
  const tagMap = await tagsFor(db, rows.map((r) => r.id))
  return rows.map((row) => ({ row, tags: tagMap.get(row.id) ?? [] }))
}

/**
 * Every published photo that carries GPS coordinates, lightweight shape for
 * the atlas map. We only select the columns the map markers need rather than
 * the full row, so the payload stays small even with many pins.
 */
export interface GeoPhoto {
  slug: string
  lat: number
  lon: number
  thumb: string
  caption: string | null
  place: string | null
  countryCode: string | null
}

export async function listGeoPhotos(db: SqlDb): Promise<GeoPhoto[]> {
  const { results } = await db
    .prepare(
      `SELECT slug, gps_lat AS lat, gps_lon AS lon, r2_thumb AS thumb, caption, place, country_code AS countryCode
       FROM photos
       WHERE published = 1 AND gps_lat IS NOT NULL AND gps_lon IS NOT NULL
       ORDER BY taken_at DESC, created_at DESC`,
    )
    .all<GeoPhoto>()
  return results
}

export async function getPhoto(db: SqlDb, id: string): Promise<PhotoWithTags | null> {
  const row = await db.prepare(`SELECT ${COLS} FROM photos WHERE id = ? OR slug = ?`).bind(id, id).first<PhotoRow>()
  if (!row) return null
  const tagMap = await tagsFor(db, [row.id])
  return { row, tags: tagMap.get(row.id) ?? [] }
}

export async function listTagCounts(db: SqlDb): Promise<{ name: string; count: number }[]> {
  const { results } = await db
    .prepare(
      `SELECT t.name AS name, COUNT(pt.photo_id) AS count FROM tags t
       JOIN photo_tags pt ON pt.tag_id = t.id JOIN photos p ON p.id = pt.photo_id AND p.published = 1
       GROUP BY t.id HAVING count > 0 ORDER BY count DESC, t.name ASC`,
    )
    .all<{ name: string; count: number }>()
  return results
}

export async function deletePhoto(db: SqlDb, id: string): Promise<string[]> {
  const row = await db.prepare("SELECT r2_original, r2_large, r2_thumb FROM photos WHERE id = ?").bind(id).first<{
    r2_original: string; r2_large: string; r2_thumb: string
  }>()
  if (!row) return []
  await db.prepare("DELETE FROM photos WHERE id = ?").bind(id).run()
  return [row.r2_original, row.r2_large, row.r2_thumb]
}

export async function updatePhoto(
  db: SqlDb, id: string,
  patch: Partial<Pick<PhotoRow, "caption" | "place" | "country" | "country_code" | "published" | "gps_lat" | "gps_lon">>,
): Promise<void> {
  const ALLOWED = new Set(["caption", "place", "country", "country_code", "published", "gps_lat", "gps_lon"])
  const fields = Object.keys(patch).filter((f) => ALLOWED.has(f))
  if (fields.length) {
    const set = fields.map((f) => `${f} = ?`).join(", ")
    await db.prepare(`UPDATE photos SET ${set} WHERE id = ?`).bind(...fields.map((f) => (patch as Record<string, unknown>)[f]), id).run()
  }
}

export async function setTags(db: SqlDb, id: string, tags: string[]): Promise<void> {
  await db.prepare("DELETE FROM photo_tags WHERE photo_id = ?").bind(id).run()
  await upsertTags(db, id, tags)
}

async function upsertTags(db: SqlDb, photoId: string, tags: string[]): Promise<void> {
  if (tags.length === 0) return
  const ph = tags.map(() => "?").join(",")
  await db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES ${tags.map(() => "(?)").join(",")}`).bind(...tags).run()
  const rows = await db
    .prepare(`SELECT id, name FROM tags WHERE name IN (${ph})`)
    .bind(...tags)
    .all<{ id: number; name: string }>()
  if (rows.results.length === 0) return
  const vals = rows.results.map(() => "(?,?)").join(",")
  const binds = rows.results.flatMap((r) => [photoId, r.id])
  await db.prepare(`INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES ${vals}`).bind(...binds).run()
}
