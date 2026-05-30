import { endSession } from "@/lib/authctx"

export const runtime = "nodejs"

export async function POST() {
  await endSession()
  return Response.json({ ok: true })
}
