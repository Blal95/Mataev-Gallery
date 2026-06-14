import { cdnBase } from "@/lib/env"
import { db } from "@/lib/db"
import { getPhoto } from "@/lib/photos"

export const runtime = "nodejs"

// Legacy route: originals (and videos) are now served straight from the R2 CDN,
// which also supports HTTP range requests. Kept as a 301 redirect so old links
// keep resolving.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const found = await getPhoto(await db(), slug)
  if (!found) return new Response("not found", { status: 404 })
  const base = await cdnBase()
  return Response.redirect(`${base}/${found.row.r2_original}`, 301)
}
