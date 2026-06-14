import { cdnBase } from "@/lib/env"
import { db } from "@/lib/db"
import { getPhoto } from "@/lib/photos"

export const runtime = "nodejs"

// Legacy route: images are now served straight from the R2 CDN. Kept as a 301
// redirect so old links, feeds, and cached social embeds keep resolving.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const found = await getPhoto(await db(), slug)
  if (!found) return new Response("not found", { status: 404 })
  const base = await cdnBase()
  return Response.redirect(`${base}/${found.row.r2_large}`, 301)
}
