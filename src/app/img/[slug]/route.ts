import { cf } from "@/lib/env"
import { db } from "@/lib/db"
import { getPhoto } from "@/lib/photos"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // This logic depends on how you structured your directory.
  // If your route is app/api/img/[slug]/route.ts, 
  // you must handle the variants:
  
  const isOriginal = _req.url.includes('/full');
  const isThumb = _req.url.includes('/thumb');

  const found = await getPhoto(await db(), slug);
  if (!found) return new Response("not found", { status: 404 });

  const env = await cf();
  
  // Choose the right R2 key based on the path
  const r2Key = isOriginal ? found.row.r2_original : 
                isThumb ? found.row.r2_thumb : 
                found.row.r2_large;

  const obj = await env.PHOTOS.get(r2Key);
  if (!obj) return new Response("not found", { status: 404 });

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": obj.httpEtag,
    },
  });
}