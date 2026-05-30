import { db } from "@/lib/db"
import { cdnBase, allowedOrigins } from "@/lib/env"
import { buildPhotosResponse, corsHeaders, PUBLIC_CACHE } from "@/lib/api"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const origin = req.headers.get("Origin")
  const tag = new URL(req.url).searchParams.get("tag") ?? undefined
  const body = await buildPhotosResponse(db(), cdnBase(), { tag })
  return Response.json(body, {
    headers: { ...corsHeaders(origin, allowedOrigins()), "Cache-Control": PUBLIC_CACHE },
  })
}

export function OPTIONS(req: Request) {
  return new Response(null, { headers: corsHeaders(req.headers.get("Origin"), allowedOrigins()) })
}
