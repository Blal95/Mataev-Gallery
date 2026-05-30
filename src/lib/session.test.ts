import { webcrypto } from "node:crypto"
if (!globalThis.crypto) (globalThis as unknown as { crypto: typeof webcrypto }).crypto = webcrypto

import { describe, it, expect } from "vitest"
import { signSession, verifySession } from "./session"

const secret = "test-secret-please-change"

describe("session", () => {
  it("round-trips a signed payload", async () => {
    const token = await signSession({ sub: "admin", exp: Date.now() + 10000 }, secret)
    const out = await verifySession(token, secret)
    expect(out?.sub).toBe("admin")
  })
  it("rejects a tampered token", async () => {
    const token = await signSession({ sub: "admin", exp: Date.now() + 10000 }, secret)
    expect(await verifySession(token.slice(0, -2) + "xx", secret)).toBeNull()
  })
  it("rejects an expired token", async () => {
    const token = await signSession({ sub: "admin", exp: Date.now() - 1 }, secret)
    expect(await verifySession(token, secret)).toBeNull()
  })
  it("rejects a wrong secret", async () => {
    const token = await signSession({ sub: "admin", exp: Date.now() + 10000 }, secret)
    expect(await verifySession(token, "other")).toBeNull()
  })
})
