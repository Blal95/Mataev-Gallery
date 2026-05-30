import { db } from "@/lib/db"
import { authVerify } from "@/lib/webauthn"
import { challengeId, startSession } from "@/lib/authctx"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = (await req.json()) as { id: string } & Record<string, unknown>
  const result = await authVerify(db(), await challengeId(), body)
  if (result.verified) await startSession()
  return Response.json(result)
}
