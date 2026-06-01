import { cookies } from "next/headers"
import { cf } from "./env"
import { cookieSecure } from "./webauthn-rp"
import { verifySession, signSession, SESSION_COOKIE } from "./session"

const CHALLENGE_COOKIE = "gallery_chal"

export async function challengeId(): Promise<string> {
  const jar = await cookies()
  const secure = await cookieSecure()
  let id = jar.get(CHALLENGE_COOKIE)?.value
  if (!id) {
    id = crypto.randomUUID()
    jar.set(CHALLENGE_COOKIE, id, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 600 })
  }
  return id
}

export async function startSession(): Promise<void> {
  const jar = await cookies()
  const secure = await cookieSecure()
  const token = await signSession({ sub: "admin", exp: Date.now() + 30 * 864e5 }, cf().SESSION_SECRET)
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 30 * 86400 })
}

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return false
  return (await verifySession(token, cf().SESSION_SECRET)) !== null
}

export async function endSession(): Promise<void> {
  ;(await cookies()).delete(SESSION_COOKIE)
}
