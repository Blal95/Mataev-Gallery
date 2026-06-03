import { headers } from "next/headers"
import { cf } from "./env"

export async function webauthnRp(): Promise<{ rpID: string; origin: string }> {
  const env = await cf()
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

export async function cookieSecure(): Promise<boolean> {
  const host = (await headers()).get("host") ?? ""
  return !host.startsWith("localhost") && !host.startsWith("127.0.0.1")
}
