import { cf } from "@/lib/env"
import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { getPhoto, setVideoKey } from "@/lib/photos"
import { photoKeys } from "@/lib/r2"
import { sameOriginGuard } from "@/lib/api"
import { revalidatePath } from "next/cache"

export const runtime = "nodejs"

// Receives the browser-transcoded 1080p MP4. r2_video is only set once the
// object is stored, so a failed transcode/upload leaves the original playing.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!sameOriginGuard(req)) return Response.json({ error: "bad origin" }, { status: 403 })

  const { id } = await params
  const database = await db()
  const found = await getPhoto(database, id, { all: true })
  if (!found || found.row.media_type !== "video") return Response.json({ error: "not found" }, { status: 404 })
  if (!req.body) return Response.json({ error: "missing body" }, { status: 400 })

  // Same known-length requirement as the original upload route.
  const contentLength = Number(req.headers.get("Content-Length"))
  let body: ReadableStream | ArrayBuffer
  if (Number.isFinite(contentLength) && contentLength > 0) {
    const fixed = new FixedLengthStream(contentLength)
    req.body.pipeTo(fixed.writable).catch(() => {})
    body = fixed.readable
  } else {
    body = await req.arrayBuffer()
  }

  const key = photoKeys(id, "mp4").video
  await (await cf()).PHOTOS.put(key, body, {
    httpMetadata: { contentType: "video/mp4", cacheControl: "public, max-age=31536000, immutable" },
  })
  await setVideoKey(database, id, key)
  revalidatePath("/", "layout")

  return Response.json({ ok: true })
}
