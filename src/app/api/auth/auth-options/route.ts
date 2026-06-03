import { db } from "@/lib/db"
import { authOptions } from "@/lib/webauthn"
import { challengeId } from "@/lib/authctx"

export const runtime = "nodejs"

export async function POST(req: Request) {
  if (req.headers.get("Sec-Fetch-Site") === "cross-site") return Response.json({ error: "bad origin" }, { status: 403 })
  const opts = await authOptions(await db(), await challengeId())
  return Response.json(opts)
}
