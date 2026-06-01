import { db } from "@/lib/db"
import { regOptions, hasCredential } from "@/lib/webauthn"
import { challengeId, isAuthed } from "@/lib/authctx"
import { cf } from "@/lib/env"
import { webauthnRp } from "@/lib/webauthn-rp"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { code?: string }
  const already = await hasCredential(db())
  const { rpID } = await webauthnRp()
  const localDev = rpID === "localhost"

  // Production: first enroll needs code; more passkeys need an active session.
  // Local dev: allow enroll code to add a localhost passkey even when prod creds exist.
  if (already && !(await isAuthed())) {
    if (!(localDev && body.code === cf().ADMIN_ENROLL_CODE)) {
      return Response.json({ error: "forbidden" }, { status: 403 })
    }
  } else if (!already && body.code !== cf().ADMIN_ENROLL_CODE) {
    return Response.json({ error: "bad code" }, { status: 403 })
  }

  const opts = await regOptions(db(), await challengeId())
  return Response.json(opts)
}
