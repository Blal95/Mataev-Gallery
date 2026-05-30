export interface SessionPayload { sub: string; exp: number }

function b64url(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : ""
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)))
  const sig = await crypto.subtle.sign("HMAC", await key(secret), new TextEncoder().encode(body))
  return `${body}.${b64url(new Uint8Array(sig))}`
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const [body, sig] = token.split(".")
  if (!body || !sig) return null
  const ok = await crypto.subtle.verify("HMAC", await key(secret), fromB64url(sig), new TextEncoder().encode(body))
  if (!ok) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionPayload
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export const SESSION_COOKIE = "gallery_session"
