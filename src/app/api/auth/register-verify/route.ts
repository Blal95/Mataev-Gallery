import { db } from "@/lib/db"
import { regVerify } from "@/lib/webauthn"
import { challengeId, startSession } from "@/lib/authctx"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.json()
  const result = await regVerify(db(), await challengeId(), body)
  if (result.verified) await startSession()
  return Response.json(result)
}
