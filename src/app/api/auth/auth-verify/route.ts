import { db } from "@/lib/db"
import { authVerify } from "@/lib/webauthn"
import { challengeId, startSession } from "@/lib/authctx"

export const runtime = "nodejs"

export async function POST(req: Request) {
  if (req.headers.get("Sec-Fetch-Site") === "cross-site") return Response.json({ error: "bad origin" }, { status: 403 })
  const body = (await req.json()) as { id: string } & Record<string, unknown>
  const result = await authVerify(await db(), await challengeId(), body)
  if (result.verified) await startSession()
  return Response.json(result)
}
