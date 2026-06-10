import { describe, it, expect, vi } from "vitest"
import { reverseGeocode } from "./geocode"

const bdcOk = {
  ok: true,
  json: async () => ({ city: "Milan", locality: "Municipio 2", countryName: "Italy", countryCode: "IT" }),
}
const bdcEmpty = { ok: true, json: async () => ({}) }
const nominatimOk = {
  ok: true,
  json: async () => ({ address: { city: "Milano", country: "Italy", country_code: "it" } }),
}
const fail = { ok: false, json: async () => ({}) }

describe("reverseGeocode", () => {
  it("uses bigdatacloud when it answers", async () => {
    const f = vi.fn().mockResolvedValueOnce(bdcOk)
    const r = await reverseGeocode(45.49, 9.2, f as unknown as typeof fetch)
    expect(r).toEqual({ place: "Milan", country: "Italy", countryCode: "IT" })
    expect(f).toHaveBeenCalledTimes(1)
  })

  it("falls back to nominatim when bigdatacloud returns nothing", async () => {
    const f = vi.fn().mockResolvedValueOnce(bdcEmpty).mockResolvedValueOnce(nominatimOk)
    const r = await reverseGeocode(45.49, 9.2, f as unknown as typeof fetch)
    expect(r).toEqual({ place: "Milano", country: "Italy", countryCode: "IT" })
    expect(f).toHaveBeenCalledTimes(2)
    expect(String(f.mock.calls[1][0])).toContain("nominatim")
  })

  it("falls back to nominatim when bigdatacloud request fails", async () => {
    const f = vi.fn().mockResolvedValueOnce(fail).mockResolvedValueOnce(nominatimOk)
    const r = await reverseGeocode(45.49, 9.2, f as unknown as typeof fetch)
    expect(r?.place).toBe("Milano")
  })

  it("returns null when both providers fail", async () => {
    const f = vi.fn().mockResolvedValue(fail)
    expect(await reverseGeocode(45.49, 9.2, f as unknown as typeof fetch)).toBeNull()
  })

  it("refuses non-finite coords without calling any provider", async () => {
    const f = vi.fn()
    expect(await reverseGeocode(NaN, 9.2, f as unknown as typeof fetch)).toBeNull()
    expect(f).not.toHaveBeenCalled()
  })
})
