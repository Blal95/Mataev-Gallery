import { isAuthed } from "@/lib/authctx"
import { forwardGeocode, reverseGeocode } from "@/lib/geocode"

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
  return Response.json({ result })
}
