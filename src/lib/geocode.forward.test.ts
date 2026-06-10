import { describe, it, expect, vi } from "vitest"
import { forwardGeocode } from "./geocode"

describe("forwardGeocode", () => {
  it("maps nominatim results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: "59.9139",
          lon: "10.7522",
          display_name: "Oslo, Norway",
          address: { city: "Oslo", country: "Norway", country_code: "no" },
        },
      ],
    })
    const hits = await forwardGeocode("Oslo", fetchMock as unknown as typeof fetch)
    expect(hits[0]).toMatchObject({ lat: 59.9139, lon: 10.7522, place: "Oslo", countryCode: "NO", address: "Oslo, Norway" })
  })

  it("returns empty for short query", async () => {
    expect(await forwardGeocode("a")).toEqual([])
  })
})
