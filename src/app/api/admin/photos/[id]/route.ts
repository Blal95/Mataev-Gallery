import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { updatePhoto, setTags, deletePhoto } from "@/lib/photos"
import { deletePhotoObjects } from "@/lib/r2"
import { parseTags } from "@/lib/tags"

export const runtime = "nodejs"

function guard(req: Request) {
  if (req.headers.get("Sec-Fetch-Site") === "cross-site") return false
  return true
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!guard(req)) return Response.json({ error: "bad origin" }, { status: 403 })
  const { id } = await params
  const body = (await req.json()) as { caption?: string; place?: string; country?: string; countryCode?: string; tags?: string; published?: number }
  await updatePhoto(db(), id, {
    caption: body.caption, place: body.place, country: body.country, country_code: body.countryCode, published: body.published,
  })
  if (body.tags != null) await setTags(db(), id, parseTags(body.tags))
  return Response.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!guard(req)) return Response.json({ error: "bad origin" }, { status: 403 })
  const { id } = await params
  const keys = await deletePhoto(db(), id)
  if (keys.length) await deletePhotoObjects(keys)
  return Response.json({ ok: true })
}
