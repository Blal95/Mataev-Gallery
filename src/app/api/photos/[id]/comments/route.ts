import { db } from "@/lib/db"
import { getPhoto } from "@/lib/photos"
import { countRecentByIp, insertComment, listComments } from "@/lib/comments"
import { hashIp } from "@/lib/ip-hash"

export const runtime = "nodejs"

const RATE_WINDOW_MS = 60 * 60 * 1000
const RATE_MAX = 8

function guard(req: Request) {
  return req.headers.get("Sec-Fetch-Site") !== "cross-site"
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const database = await db()
  const found = await getPhoto(database, id)
  if (!found) return Response.json({ error: "not found" }, { status: 404 })
  const comments = await listComments(database, found.row.id)
  return Response.json({ comments })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!guard(req)) return Response.json({ error: "bad origin" }, { status: 403 })
  const { id } = await params
  const database = await db()
  const found = await getPhoto(database, id)
  if (!found) return Response.json({ error: "not found" }, { status: 404 })

  const body = (await req.json()) as { author?: string; body?: string; website?: string }
  if (body.website?.trim()) return Response.json({ ok: true })

  const author = (body.author ?? "").trim().slice(0, 40)
  const text = (body.body ?? "").trim().slice(0, 500)
  if (author.length < 1 || text.length < 1) {
    return Response.json({ error: "name and comment required" }, { status: 400 })
  }

  const ipHash = await hashIp(req)
  const recent = await countRecentByIp(database, ipHash, Date.now() - RATE_WINDOW_MS)
  if (recent >= RATE_MAX) {
    return Response.json({ error: "too many comments — try again later" }, { status: 429 })
  }

  const comment = await insertComment(database, found.row.id, author, text, ipHash)
  return Response.json({ comment })
}
