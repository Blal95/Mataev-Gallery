import { db } from "@/lib/db"
import { authOptions } from "@/lib/webauthn"
import { challengeId } from "@/lib/authctx"

export const runtime = "nodejs"

export async function POST() {
  const opts = await authOptions(db(), await challengeId())
  return Response.json(opts)
}
