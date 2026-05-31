import { db } from "@/lib/db"
import { cdnBase, allowedOrigins } from "@/lib/env"
import { buildPhotosResponse, corsHeaders, PUBLIC_CACHE } from "@/lib/api"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const origin = req.headers.get("Origin")
  const sp = new URL(req.url).searchParams
  const tag = sp.get("tag") ?? undefined
  const limitRaw = sp.get("limit")
  const offsetRaw = sp.get("offset")
  const limit = limitRaw != null ? Math.max(1, parseInt(limitRaw, 10) || 1) : undefined
  const offset = offsetRaw != null ? Math.max(0, parseInt(offsetRaw, 10) || 0) : undefined
  const body = await buildPhotosResponse(db(), cdnBase(), { tag, limit, offset })
  return Response.json(body, {
    headers: { ...corsHeaders(origin, allowedOrigins()), "Cache-Control": PUBLIC_CACHE },
  })
}

export function OPTIONS(req: Request) {
  return new Response(null, { headers: corsHeaders(req.headers.get("Origin"), allowedOrigins()) })
}
