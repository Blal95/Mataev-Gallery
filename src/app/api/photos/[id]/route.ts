import { db } from "@/lib/db"
import { allowedOrigins, cdnBase } from "@/lib/env"
import { corsHeaders, PUBLIC_CACHE } from "@/lib/api"
import { getPhoto } from "@/lib/photos"
import { rowToDTO } from "@/lib/serialize"

export const runtime = "nodejs"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [database, origins, base] = await Promise.all([db(), allowedOrigins(), cdnBase()])
  const found = await getPhoto(database, id)
  const origin = req.headers.get("Origin")
  if (!found) return Response.json({ error: "not found" }, { status: 404, headers: corsHeaders(origin, origins) })
  return Response.json(rowToDTO(found.row, found.tags, base), {
    headers: { ...corsHeaders(origin, origins), "Cache-Control": PUBLIC_CACHE },
  })
}

export async function OPTIONS(req: Request) {
  return new Response(null, { headers: corsHeaders(req.headers.get("Origin"), await allowedOrigins()) })
}
