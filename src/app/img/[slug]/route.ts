import { cf } from "@/lib/env"
import { db } from "@/lib/db"
import { getPhoto } from "@/lib/photos"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const found = await getPhoto(await db(), slug)
  if (!found) return new Response("not found", { status: 404 })

  const env = await cf()
  const obj = await env.PHOTOS.get(found.row.r2_large)
  if (!obj) return new Response("not found", { status: 404 })

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": obj.httpEtag,
    },
  })
}
