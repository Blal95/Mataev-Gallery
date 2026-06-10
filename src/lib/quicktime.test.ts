import { describe, it, expect } from "vitest"
import { parseIso6709, findVideoGps, findVideoCreationDate } from "./quicktime"

const enc = (s: string) => new TextEncoder().encode(s)

function withNoise(payload: string): Uint8Array {
  const noise = new Uint8Array(4096)
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 31 + 7) % 256
  const p = enc(payload)
  const out = new Uint8Array(noise.length * 2 + p.length)
  out.set(noise, 0)
  out.set(p, noise.length)
  out.set(noise, noise.length + p.length)
  return out
}

describe("parseIso6709", () => {
  it("parses lat/lon/alt", () => {
    expect(parseIso6709("+45.4746+009.1765+130.849/")).toEqual({ lat: 45.4746, lon: 9.1765, alt: 130.849 })
  })

  it("parses without altitude", () => {
    expect(parseIso6709("-33.8568+151.2153/")).toEqual({ lat: -33.8568, lon: 151.2153, alt: null })
  })

  it("rejects junk, null island, and out-of-range coords", () => {
    expect(parseIso6709("not a location")).toBeNull()
    expect(parseIso6709("+0.0+0.0/")).toBeNull()
    expect(parseIso6709("+95.1+10.0/")).toBeNull()
    expect(parseIso6709("+10.0+190.0/")).toBeNull()
  })
})

describe("findVideoGps", () => {
  it("finds the iPhone quicktime location value in raw bytes", () => {
    const bytes = withNoise("mdtacom.apple.quicktime.location.ISO6709\0\0\0data+45.4746+009.1765+130.849/")
    expect(findVideoGps(bytes)).toEqual({ lat: 45.4746, lon: 9.1765, alt: 130.849 })
  })

  it("finds a ©xyz udta value with CRS suffix", () => {
    const bytes = withNoise("©xyz\0Ç+59.9139+010.7522CRSWGS_84/")
    expect(findVideoGps(bytes)).toEqual({ lat: 59.9139, lon: 10.7522, alt: null })
  })

  it("returns null for binary noise", () => {
    expect(findVideoGps(withNoise(""))).toBeNull()
  })
})

describe("findVideoCreationDate", () => {
  it("reads the quicktime creationdate value", () => {
    const bytes = withNoise("mdtacom.apple.quicktime.creationdate\0\0\0data2026-06-07T18:16:09+0200")
    expect(findVideoCreationDate(bytes)).toBe(Date.parse("2026-06-07T18:16:09+0200"))
  })

  it("ignores ISO dates without the quicktime key anchor", () => {
    expect(findVideoCreationDate(withNoise("subtitle 2024-01-01T10:00:00Z text"))).toBeNull()
  })

  it("rejects implausible years", () => {
    const bytes = withNoise("com.apple.quicktime.creationdate 1850-06-07T18:16:09Z")
    expect(findVideoCreationDate(bytes)).toBeNull()
  })
})
