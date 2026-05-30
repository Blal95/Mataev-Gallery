import { isAuthed } from "@/lib/authctx"
import { hasCredential } from "@/lib/webauthn"
import { db } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const [authed, enrolled] = await Promise.all([isAuthed(), hasCredential(db())])
  return Response.json({ authed, enrolled })
}
