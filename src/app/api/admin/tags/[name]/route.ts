import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { deleteTag, renameTag } from "@/lib/photos"
import { sameOriginGuard as guard } from "@/lib/api"
import { revalidatePath } from "next/cache"

export const runtime = "nodejs"

export async function PATCH(req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!guard(req)) return Response.json({ error: "bad origin" }, { status: 403 })
  const { name } = await params
  const body = (await req.json()) as { newName?: string }
  const newName = body.newName?.trim().toLowerCase().replace(/\s+/g, "-")
  if (!newName) return Response.json({ error: "newName required" }, { status: 400 })
  await renameTag(await db(), decodeURIComponent(name), newName)
  revalidatePath("/", "layout")
  return Response.json({ ok: true, newName })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!guard(req)) return Response.json({ error: "bad origin" }, { status: 403 })
  const { name } = await params
  await deleteTag(await db(), decodeURIComponent(name))
  revalidatePath("/", "layout")
  return Response.json({ ok: true })
}
