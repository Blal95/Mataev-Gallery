import { isAuthed } from "@/lib/authctx"
import { forwardGeocode, reverseGeocode, reverseGeocodeAddress } from "@/lib/geocode"
import { findVideoGps, findVideoCreationDate, type VideoGps } from "@/lib/quicktime"
import { updatePhoto } from "@/lib/photos"
import { sameOriginGuard } from "@/lib/api"
import { db } from "@/lib/db"
import { cf } from "@/lib/env"

export const runtime = "nodejs"

export async function GET(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  const url = new URL(req.url)
  const q = url.searchParams.get("q")
  if (q) {
    const results = await forwardGeocode(q)
    return Response.json({ results })
  }
  const lat = Number(url.searchParams.get("lat"))
  const lon = Number(url.searchParams.get("lon"))
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "q or lat/lon required" }, { status: 400 })
  }
  const result = await reverseGeocode(lat, lon)
  if (url.searchParams.get("full") != null) {
    const address = await reverseGeocodeAddress(lat, lon)
    return Response.json({ result, address })
  }
  return Response.json({ result })
}

const SCAN_BYTES = 8 * 1024 * 1024

/** Scan a stored video's head and tail for QuickTime location + capture time. */
async function scanOriginalForMeta(key: string): Promise<{ gps: VideoGps | null; takenAt: number | null }> {
  const bucket = (await cf()).PHOTOS
  const head = await bucket.get(key, { range: { offset: 0, length: SCAN_BYTES } })
  if (!head) return { gps: null, takenAt: null }
  const headBytes = new Uint8Array(await head.arrayBuffer())
  let gps = findVideoGps(headBytes)
  let takenAt = findVideoCreationDate(headBytes)
  if ((!gps || !takenAt) && head.size > SCAN_BYTES) {
    const tail = await bucket.get(key, { range: { offset: head.size - SCAN_BYTES, length: SCAN_BYTES } })
    if (tail) {
      const tailBytes = new Uint8Array(await tail.arrayBuffer())
      gps = gps ?? findVideoGps(tailBytes)
      takenAt = takenAt ?? findVideoCreationDate(tailBytes)
    }
  }
  return { gps, takenAt }
}

/**
 * Backfill locations for existing rows:
 * 1. videos with no GPS — extract it from the R2 original (uploads predating
 *    client-side video GPS extraction never got coords);
 * 2. anything with GPS but no place — retry reverse geocoding (historic
 *    provider failures stuck as NULL).
 */
export async function POST(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!sameOriginGuard(req)) return Response.json({ error: "bad origin" }, { status: 403 })
  const database = await db()

  const videos = (await database.prepare(
    "SELECT id, r2_original FROM photos WHERE media_type = 'video' AND gps_lat IS NULL",
  ).all<{ id: string; r2_original: string }>()).results
  let videosLocated = 0
  for (const v of videos) {
    const meta = await scanOriginalForMeta(v.r2_original).catch(() => ({ gps: null, takenAt: null }))
    if (!meta.gps && !meta.takenAt) continue
    await updatePhoto(database, v.id, {
      gps_lat: meta.gps?.lat, gps_lon: meta.gps?.lon, gps_alt: meta.gps?.alt,
      taken_at: meta.takenAt ?? undefined,
    })
    if (meta.gps) videosLocated++
  }

  const noPlace = (await database.prepare(
    "SELECT id, gps_lat AS lat, gps_lon AS lon FROM photos WHERE gps_lat IS NOT NULL AND gps_lon IS NOT NULL AND (place IS NULL OR place = '')",
  ).all<{ id: string; lat: number; lon: number }>()).results
  let placesFilled = 0
  for (const r of noPlace) {
    const geo = await reverseGeocode(r.lat, r.lon)
    if (!geo || (!geo.place && !geo.country)) continue
    await updatePhoto(database, r.id, { place: geo.place, country: geo.country, country_code: geo.countryCode })
    placesFilled++
  }

  return Response.json({
    ok: true,
    videosScanned: videos.length,
    videosLocated,
    placesChecked: noPlace.length,
    placesFilled,
  })
}
