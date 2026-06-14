import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { updatePhoto, setTags, deletePhoto } from "@/lib/photos"
import { deletePhotoObjects } from "@/lib/r2"
import { parseTags } from "@/lib/tags"
import { sameOriginGuard as guard } from "@/lib/api"
import { revalidatePath } from "next/cache"

export const runtime = "nodejs"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!guard(req)) return Response.json({ error: "bad origin" }, { status: 403 })
  const { id } = await params
  const body = (await req.json()) as {
    caption?: string; place?: string | null; country?: string | null; countryCode?: string | null
    lat?: number | null; lon?: number | null; tags?: string; published?: number
  }
  const database = await db()
  await updatePhoto(database, id, {
    caption: body.caption,
    place: body.place ?? undefined,
    country: body.country ?? undefined,
    country_code: body.countryCode ?? undefined,
    published: body.published,
    gps_lat: body.lat === undefined ? undefined : body.lat,
    gps_lon: body.lon === undefined ? undefined : body.lon,
  })
  if (body.tags != null) await setTags(database, id, parseTags(body.tags))
  revalidatePath("/", "layout")
  return Response.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!guard(req)) return Response.json({ error: "bad origin" }, { status: 403 })
  const { id } = await params
  const keys = await deletePhoto(await db(), id)
  if (keys.length) await deletePhotoObjects(keys)
  return Response.json({ ok: true })
}
