import type { SqlDb } from "@/lib/sqldb"
import type { PhotoRow } from "@/types/photo"

export interface PhotoWithTags { row: PhotoRow; tags: string[] }

const COLS =
  "id,slug,caption,taken_at,created_at,width,height,aspect,bytes,format,color_space," +
  "camera_make,camera_model,lens_model,focal_length,f_number,exposure_time,iso," +
  "gps_lat,gps_lon,gps_alt,place,country,country_code,thumbhash," +
  "r2_original,r2_large,r2_thumb,published,sort_index"

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
      row.published, row.sort_index,
    )
    .run()
  for (const name of tags) {
    await db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").bind(name).run()
    const tag = await db.prepare("SELECT id FROM tags WHERE name = ?").bind(name).first<{ id: number }>()
    if (tag) {
      await db.prepare("INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)").bind(row.id, tag.id).run()
    }
  }
}

export async function listPhotos(db: SqlDb, opts: { tag?: string }): Promise<PhotoWithTags[]> {
  let rows: PhotoRow[]
  if (opts.tag) {
    const r = await db
      .prepare(
        `SELECT ${COLS.split(",").map((c) => "p." + c).join(",")} FROM photos p
         JOIN photo_tags pt ON pt.photo_id = p.id JOIN tags t ON t.id = pt.tag_id
         WHERE t.name = ? AND p.published = 1 ORDER BY p.taken_at DESC, p.created_at DESC`,
      )
      .bind(opts.tag)
      .all<PhotoRow>()
    rows = r.results
  } else {
    const r = await db
      .prepare(`SELECT ${COLS} FROM photos WHERE published = 1 ORDER BY taken_at DESC, created_at DESC`)
      .all<PhotoRow>()
    rows = r.results
  }
  const tagMap = await tagsFor(db, rows.map((r) => r.id))
  return rows.map((row) => ({ row, tags: tagMap.get(row.id) ?? [] }))
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
  patch: Partial<Pick<PhotoRow, "caption" | "place" | "country" | "country_code" | "published">>,
): Promise<void> {
  const ALLOWED = new Set(["caption", "place", "country", "country_code", "published"])
  const fields = Object.keys(patch).filter((f) => ALLOWED.has(f))
  if (fields.length) {
    const set = fields.map((f) => `${f} = ?`).join(", ")
    await db.prepare(`UPDATE photos SET ${set} WHERE id = ?`).bind(...fields.map((f) => (patch as Record<string, unknown>)[f]), id).run()
  }
}

export async function setTags(db: SqlDb, id: string, tags: string[]): Promise<void> {
  await db.prepare("DELETE FROM photo_tags WHERE photo_id = ?").bind(id).run()
  for (const name of tags) {
    await db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").bind(name).run()
    const tag = await db.prepare("SELECT id FROM tags WHERE name = ?").bind(name).first<{ id: number }>()
    if (tag) await db.prepare("INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)").bind(id, tag.id).run()
  }
}
