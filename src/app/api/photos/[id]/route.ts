import { db } from "@/lib/db"
import { cdnBase, allowedOrigins } from "@/lib/env"
import { corsHeaders, PUBLIC_CACHE } from "@/lib/api"
import { getPhoto } from "@/lib/photos"
import { rowToDTO } from "@/lib/serialize"

export const runtime = "nodejs"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const found = await getPhoto(db(), id)
  const origin = req.headers.get("Origin")
  if (!found) return Response.json({ error: "not found" }, { status: 404, headers: corsHeaders(origin, allowedOrigins()) })
  return Response.json(rowToDTO(found.row, found.tags, cdnBase()), {
    headers: { ...corsHeaders(origin, allowedOrigins()), "Cache-Control": PUBLIC_CACHE },
  })
}

export function OPTIONS(req: Request) {
  return new Response(null, { headers: corsHeaders(req.headers.get("Origin"), allowedOrigins()) })
}
