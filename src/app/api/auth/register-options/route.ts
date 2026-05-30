import { db } from "@/lib/db"
import { regOptions } from "@/lib/webauthn"
import { challengeId } from "@/lib/authctx"
import { hasCredential } from "@/lib/webauthn"
import { isAuthed } from "@/lib/authctx"
import { cf } from "@/lib/env"

export const runtime = "nodejs"

export async function POST(req: Request) {
  // First enrollment requires the enroll code; subsequent ones require a session.
  const already = await hasCredential(db())
  if (already && !(await isAuthed())) return Response.json({ error: "forbidden" }, { status: 403 })
  if (!already) {
    const { code } = (await req.json().catch(() => ({}))) as { code?: string }
    if (code !== cf().ADMIN_ENROLL_CODE) return Response.json({ error: "bad code" }, { status: 403 })
  }
  const opts = await regOptions(db(), await challengeId())
  return Response.json(opts)
}
