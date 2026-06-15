import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { deleteTag } from "@/lib/photos"
import { sameOriginGuard as guard } from "@/lib/api"
import { revalidatePath } from "next/cache"

export const runtime = "nodejs"

export async function DELETE(req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!guard(req)) return Response.json({ error: "bad origin" }, { status: 403 })
  const { name } = await params
  await deleteTag(await db(), decodeURIComponent(name))
  revalidatePath("/", "layout")
  return Response.json({ ok: true })
}
