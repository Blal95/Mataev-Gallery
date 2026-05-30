import { thumbHashToDataURL } from "thumbhash"

export function thumbhashToUrl(base64: string | null): string | undefined {
  if (!base64) return undefined
  try {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return thumbHashToDataURL(bytes)
  } catch {
    return undefined
  }
}
