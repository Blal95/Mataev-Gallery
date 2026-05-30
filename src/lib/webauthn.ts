import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from "@simplewebauthn/server"
import type { SqlDb } from "./sqldb"
import { cf } from "./env"

const CHALLENGE_TTL = 5 * 60 * 1000

async function saveChallenge(db: SqlDb, id: string, challenge: string, kind: "register" | "authenticate") {
  await db.prepare("INSERT OR REPLACE INTO auth_challenges (id, challenge, kind, expires_at) VALUES (?,?,?,?)")
    .bind(id, challenge, kind, Date.now() + CHALLENGE_TTL).run()
}
async function takeChallenge(db: SqlDb, id: string, kind: string): Promise<string | null> {
  const row = await db.prepare("SELECT challenge, expires_at FROM auth_challenges WHERE id = ? AND kind = ?")
    .bind(id, kind).first<{ challenge: string; expires_at: number }>()
  await db.prepare("DELETE FROM auth_challenges WHERE id = ?").bind(id).run()
  if (!row || row.expires_at < Date.now()) return null
  return row.challenge
}

export async function regOptions(db: SqlDb, sessionId: string) {
  const env = cf()
  const opts = await generateRegistrationOptions({
    rpName: "MATAEV Gallery", rpID: env.RP_ID, userName: "bilal", attestationType: "none",
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  })
  await saveChallenge(db, sessionId, opts.challenge, "register")
  return opts
}

export async function regVerify(db: SqlDb, sessionId: string, body: unknown) {
  const env = cf()
  const expectedChallenge = await takeChallenge(db, sessionId, "register")
  if (!expectedChallenge) return { verified: false as const }
  const verification = await verifyRegistrationResponse({
    response: body as never, expectedChallenge, expectedOrigin: env.RP_ORIGIN, expectedRPID: env.RP_ID,
  })
  if (verification.verified && verification.registrationInfo) {
    const { credential } = verification.registrationInfo
    await db.prepare("INSERT OR REPLACE INTO credentials (id, public_key, counter, transports, created_at) VALUES (?,?,?,?,?)")
      .bind(credential.id, credential.publicKey, credential.counter, JSON.stringify(credential.transports ?? []), Date.now()).run()
  }
  return { verified: verification.verified }
}

export async function authOptions(db: SqlDb, sessionId: string) {
  const env = cf()
  const opts = await generateAuthenticationOptions({ rpID: env.RP_ID, userVerification: "preferred" })
  await saveChallenge(db, sessionId, opts.challenge, "authenticate")
  return opts
}

export async function authVerify(db: SqlDb, sessionId: string, body: { id: string } & Record<string, unknown>) {
  const env = cf()
  const expectedChallenge = await takeChallenge(db, sessionId, "authenticate")
  if (!expectedChallenge) return { verified: false as const }
  const cred = await db.prepare("SELECT id, public_key, counter, transports FROM credentials WHERE id = ?")
    .bind(body.id).first<{ id: string; public_key: Uint8Array<ArrayBuffer>; counter: number; transports: string }>()
  if (!cred) return { verified: false as const }
  const verification = await verifyAuthenticationResponse({
    response: body as never, expectedChallenge, expectedOrigin: env.RP_ORIGIN, expectedRPID: env.RP_ID,
    credential: { id: cred.id, publicKey: cred.public_key, counter: cred.counter, transports: JSON.parse(cred.transports || "[]") },
  })
  if (verification.verified) {
    await db.prepare("UPDATE credentials SET counter = ?, last_used_at = ? WHERE id = ?")
      .bind(verification.authenticationInfo.newCounter, Date.now(), cred.id).run()
  }
  return { verified: verification.verified }
}

export async function hasCredential(db: SqlDb): Promise<boolean> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM credentials").first<{ n: number }>()
  return (row?.n ?? 0) > 0
}
