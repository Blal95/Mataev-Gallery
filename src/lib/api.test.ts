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
  media_type: "photo", duration: null, views: 0,
})

describe("api", () => {
  it("builds the PhotosResponse with cdn urls + tag counts", async () => {
    const db = makeTestDb()
    await insertPhoto(db, row("p1"), ["norway"])
    const res = await buildPhotosResponse(db,{})
    expect(res.photos[0].url.thumb).toBe("/img/p1/thumb")
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

  // Pagination / nextOffset tests
  it("nextOffset is null when no limit given (backward compat)", async () => {
    const db = makeTestDb()
    await insertPhoto(db, row("p1"), [])
    const res = await buildPhotosResponse(db,{})
    expect(res.nextOffset).toBeNull()
  })
  it("nextOffset equals offset+limit when page is full", async () => {
    const db = makeTestDb()
    await insertPhoto(db, row("p1"), [])
    await insertPhoto(db, row("p2"), [])
    await insertPhoto(db, row("p3"), [])
    const res = await buildPhotosResponse(db,{ limit: 2, offset: 0 })
    expect(res.photos).toHaveLength(2)
    expect(res.nextOffset).toBe(2)
  })
  it("nextOffset is null when page is partial (last page)", async () => {
    const db = makeTestDb()
    await insertPhoto(db, row("p1"), [])
    await insertPhoto(db, row("p2"), [])
    const res = await buildPhotosResponse(db,{ limit: 5, offset: 0 })
    expect(res.photos).toHaveLength(2)
    expect(res.nextOffset).toBeNull()
  })
  it("nextOffset correctly advances on page 2", async () => {
    const db = makeTestDb()
    for (let i = 1; i <= 5; i++) await insertPhoto(db, row(`p${i}`), [])
    const p1 = await buildPhotosResponse(db,{ limit: 2, offset: 0 })
    expect(p1.nextOffset).toBe(2)
    const p2 = await buildPhotosResponse(db,{ limit: 2, offset: p1.nextOffset! })
    expect(p2.nextOffset).toBe(4)
    const p3 = await buildPhotosResponse(db,{ limit: 2, offset: p2.nextOffset! })
    expect(p3.photos).toHaveLength(1)
    expect(p3.nextOffset).toBeNull()
  })
  it("tags are always full regardless of pagination", async () => {
    const db = makeTestDb()
    await insertPhoto(db, row("p1"), ["norway"])
    await insertPhoto(db, row("p2"), ["lofoten"])
    const res = await buildPhotosResponse(db,{ limit: 1, offset: 0 })
    expect(res.tags).toHaveLength(2)
  })
})
