import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { deleteComment } from "@/lib/comments"

export const runtime = "nodejs"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (req.headers.get("Sec-Fetch-Site") === "cross-site") return Response.json({ error: "bad origin" }, { status: 403 })
  const { id } = await params
  await deleteComment(await db(), id)
  return Response.json({ ok: true })
}
