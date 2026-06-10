import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { putPhotoObject, photoKeys } from "@/lib/r2"
import { insertPhoto } from "@/lib/photos"
import { reverseGeocode } from "@/lib/geocode"
import { newId } from "@/lib/ids"
import { parseTags } from "@/lib/tags"
import { sameOriginGuard } from "@/lib/api"
import type { PhotoRow } from "@/types/photo"

export const runtime = "nodejs"

interface MetaIn {
  caption?: string; tags?: string; takenAt?: number | null
  width: number; height: number; bytes: number; format: string; ext: string; colorSpace?: string | null
  cameraMake?: string | null; cameraModel?: string | null; lens?: string | null
  focal?: number | null; fNumber?: number | null; exposure?: number | null; iso?: number | null
  lat?: number | null; lon?: number | null; alt?: number | null
  place?: string | null; country?: string | null; countryCode?: string | null
  thumbhash?: string | null
  mediaType?: string | null
  duration?: number | null
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!sameOriginGuard(req)) return Response.json({ error: "bad origin" }, { status: 403 })

  // Only large + thumb + meta — original is uploaded separately via PUT to avoid
  // multipart parsing of large files which hits the Worker CPU time limit.
  const form = await req.formData()
  const large = form.get("large") as File | null
  const thumb = form.get("thumb") as File | null
  const meta = JSON.parse((form.get("meta") as string) || "{}") as MetaIn
  if (!large || !thumb) return Response.json({ error: "missing files" }, { status: 400 })

  const id = newId()
  const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif", "mp4", "mov", "webm"]
  const ext = ALLOWED_EXT.includes((meta.ext || "").toLowerCase()) ? meta.ext.toLowerCase() : "jpg"
  const keys = photoKeys(id, ext)

  await Promise.all([
    putPhotoObject(keys.large, large, "image/webp"),
    putPhotoObject(keys.thumb, thumb, "image/webp"),
  ])

  let place = meta.place ?? null, country = meta.country ?? null, countryCode = meta.countryCode ?? null
  if (!place && meta.lat != null && meta.lon != null) {
    const geo = await reverseGeocode(meta.lat, meta.lon)
    if (geo) { place = geo.place; country = geo.country; countryCode = geo.countryCode }
  }

  const row: PhotoRow = {
    id, slug: `${meta.mediaType === "video" ? "video" : "photo"}-${id.slice(-8).toLowerCase()}`,
    caption: meta.caption?.trim() || null, taken_at: meta.takenAt ?? null, created_at: Date.now(),
    width: meta.width, height: meta.height, aspect: meta.width / meta.height,
    bytes: meta.bytes, format: meta.format, color_space: meta.colorSpace ?? null,
    camera_make: meta.cameraMake ?? null, camera_model: meta.cameraModel ?? null, lens_model: meta.lens ?? null,
    focal_length: meta.focal ?? null, f_number: meta.fNumber ?? null, exposure_time: meta.exposure ?? null, iso: meta.iso ?? null,
    gps_lat: meta.lat ?? null, gps_lon: meta.lon ?? null, gps_alt: meta.alt ?? null,
    place, country, country_code: countryCode, thumbhash: meta.thumbhash ?? null,
    r2_original: keys.original, r2_large: keys.large, r2_thumb: keys.thumb, published: 1, sort_index: null,
    media_type: meta.mediaType === "video" ? "video" : "photo",
    duration: meta.duration ?? null,
    views: 0,
  }
  await insertPhoto(await db(), row, parseTags(meta.tags ?? ""))
  return Response.json({ ok: true, id, slug: row.slug })
}
