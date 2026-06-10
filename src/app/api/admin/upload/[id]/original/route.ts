import { cf } from "@/lib/env"
import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { getPhoto } from "@/lib/photos"
import { sameOriginGuard } from "@/lib/api"

export const runtime = "nodejs"

// Receives the raw original file as the request body (no multipart parsing).
// This avoids the Worker CPU/memory limit hit when parsing large multipart bodies.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!sameOriginGuard(req)) return Response.json({ error: "bad origin" }, { status: 403 })

  const { id } = await params
  const found = await getPhoto(await db(), id, { all: true })
  if (!found) return Response.json({ error: "not found" }, { status: 404 })
  if (!req.body) return Response.json({ error: "missing body" }, { status: 400 })

  const contentType = req.headers.get("Content-Type") || "application/octet-stream"
  const env = await cf()

  // R2.put() rejects a ReadableStream whose length it can't determine. The
  // request body OpenNext hands to the route handler has lost the "known
  // length" that a native Worker request.body carries, so streaming it
  // directly throws ("Provided readable stream must have a known length") —
  // photos 500, large videos hang while the request never drains. Pipe through
  // a FixedLengthStream built from Content-Length so R2 gets the length without
  // buffering the (possibly large) file into Worker memory.
  const contentLength = Number(req.headers.get("Content-Length"))
  let body: ReadableStream | ArrayBuffer
  if (Number.isFinite(contentLength) && contentLength > 0) {
    const fixed = new FixedLengthStream(contentLength)
    req.body.pipeTo(fixed.writable).catch(() => {})
    body = fixed.readable
  } else {
    // No usable Content-Length — buffer so the length is known. Small payloads
    // only (originals normally carry Content-Length).
    body = await req.arrayBuffer()
  }

  await env.PHOTOS.put(found.row.r2_original, body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
  })

  return Response.json({ ok: true })
}
