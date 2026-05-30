import { describe, it, expect, vi } from "vitest"
import { reverseGeocode } from "./geocode"

describe("reverseGeocode", () => {
  it("maps BigDataCloud fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ city: "Svolvær", locality: "Lofoten", countryName: "Norway", countryCode: "NO" }),
    })
    const r = await reverseGeocode(68.2, 13.6, fetchMock as unknown as typeof fetch)
    expect(r).toEqual({ place: "Svolvær", country: "Norway", countryCode: "NO" })
  })
  it("falls back to locality when no city", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ locality: "Lofoten", countryName: "Norway", countryCode: "NO" }) })
    const r = await reverseGeocode(1, 1, fetchMock as unknown as typeof fetch)
    expect(r?.place).toBe("Lofoten")
  })
  it("returns null on error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false })
    expect(await reverseGeocode(1, 1, fetchMock as unknown as typeof fetch)).toBeNull()
  })
})
