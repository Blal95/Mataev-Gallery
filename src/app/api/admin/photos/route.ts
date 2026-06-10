import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { buildPhotosResponse } from "@/lib/api"

export const runtime = "nodejs"

export async function GET(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const limit = sp.get("limit") != null ? Math.max(1, parseInt(sp.get("limit")!, 10) || 1) : undefined
  const offset = sp.get("offset") != null ? Math.max(0, parseInt(sp.get("offset")!, 10) || 0) : undefined
  const body = await buildPhotosResponse(await db(), { limit, offset, all: true })
  return Response.json(body)
}
