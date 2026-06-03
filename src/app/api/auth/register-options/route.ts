import { db } from "@/lib/db"
import { cf } from "@/lib/env"
import { regOptions, hasCredential } from "@/lib/webauthn"
import { challengeId, isAuthed } from "@/lib/authctx"
import { webauthnRp } from "@/lib/webauthn-rp"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { code?: string }
  const [database, env] = await Promise.all([db(), cf()])
  const already = await hasCredential(database)
  const { rpID } = await webauthnRp()
  const localDev = rpID === "localhost"

  if (already && !(await isAuthed())) {
    if (!(localDev && body.code === env.ADMIN_ENROLL_CODE)) {
      return Response.json({ error: "forbidden" }, { status: 403 })
    }
  } else if (!already && body.code !== env.ADMIN_ENROLL_CODE) {
    return Response.json({ error: "bad code" }, { status: 403 })
  }

  const opts = await regOptions(database, await challengeId())
  return Response.json(opts)
}
