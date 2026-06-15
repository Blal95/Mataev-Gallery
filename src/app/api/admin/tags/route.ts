import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { listAllTags } from "@/lib/photos"

export const runtime = "nodejs"

export async function GET() {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  const tags = await listAllTags(await db())
  return Response.json({ tags })
}
