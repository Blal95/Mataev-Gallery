import { db } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const database = await db()
    await database.prepare("UPDATE photos SET views = views + 1 WHERE id = ? OR slug = ?").bind(id, id).run()
  } catch {}
  return new Response(null, { status: 204 })
}
