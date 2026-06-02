import { headers } from "next/headers"
import { cf } from "./env"

/** RP ID + origin for WebAuthn — localhost dev uses the request origin, prod uses wrangler vars. */
export async function webauthnRp(): Promise<{ rpID: string; origin: string }> {
  const env = cf()
  const origin = (await headers()).get("origin")
  if (origin) {
    try {
      const url = new URL(origin)
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return { rpID: "localhost", origin: url.origin }
      }
    } catch {
      /* use production config */
    }
  }
  return { rpID: env.RP_ID, origin: env.RP_ORIGIN }
}

/** HttpOnly cookies must not use Secure on local http:// or the browser drops them. */
export async function cookieSecure(): Promise<boolean> {
  const host = (await headers()).get("host") ?? ""
  return !host.startsWith("localhost") && !host.startsWith("127.0.0.1")
}
