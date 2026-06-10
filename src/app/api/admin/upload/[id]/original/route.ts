import { cf } from "@/lib/env"
import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { getPhoto } from "@/lib/photos"

export const runtime = "nodejs"

// Receives the raw original file as the request body (no multipart parsing).
// This avoids the Worker CPU/memory limit hit when parsing large multipart bodies.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (req.headers.get("Sec-Fetch-Site") === "cross-site") return Response.json({ error: "bad origin" }, { status: 403 })

  const { id } = await params
  const found = await getPhoto(await db(), id)
  if (!found) return Response.json({ error: "not found" }, { status: 404 })

  const contentType = req.headers.get("Content-Type") || "application/octet-stream"
  const env = await cf()

  // Stream body directly to R2 — never loaded into Worker memory as ArrayBuffer
  await env.PHOTOS.put(found.row.r2_original, req.body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
  })

  return Response.json({ ok: true })
}
