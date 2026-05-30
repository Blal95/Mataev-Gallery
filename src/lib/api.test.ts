import { describe, it, expect } from "vitest"
import { buildPhotosResponse, corsHeaders } from "./api"
import { makeTestDb } from "../../test/sqlite-adapter"
import { insertPhoto } from "./photos"
import type { PhotoRow } from "@/types/photo"

const row = (id: string): PhotoRow => ({
  id, slug: id, caption: null, taken_at: 1, created_at: 1, width: 3000, height: 2000, aspect: 1.5,
  bytes: 1, format: "jpeg", color_space: null, camera_make: null, camera_model: null, lens_model: null,
  focal_length: null, f_number: null, exposure_time: null, iso: null, gps_lat: null, gps_lon: null,
  gps_alt: null, place: null, country: null, country_code: null, thumbhash: null,
  r2_original: `photos/${id}/original.jpg`, r2_large: `photos/${id}/large.webp`,
  r2_thumb: `photos/${id}/thumb.webp`, published: 1, sort_index: null,
})

describe("api", () => {
  it("builds the PhotosResponse with cdn urls + tag counts", async () => {
    const db = makeTestDb()
    await insertPhoto(db, row("p1"), ["norway"])
    const res = await buildPhotosResponse(db, "https://cdn.x", {})
    expect(res.photos[0].url.thumb).toBe("https://cdn.x/photos/p1/thumb.webp")
    expect(res.tags).toEqual([{ name: "norway", count: 1 }])
  })
  it("echoes an allowed origin in CORS headers", () => {
    const h = corsHeaders("https://mataev.no", ["https://mataev.no"])
    expect(h["Access-Control-Allow-Origin"]).toBe("https://mataev.no")
  })
  it("omits ACAO for a disallowed origin", () => {
    const h = corsHeaders("https://evil.com", ["https://mataev.no"])
    expect(h["Access-Control-Allow-Origin"]).toBeUndefined()
  })
})
