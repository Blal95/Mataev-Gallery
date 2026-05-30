import { describe, it, expect } from "vitest"
import { makeTestDb } from "../../test/sqlite-adapter"
import { insertPhoto, listPhotos, getPhoto, listTagCounts, deletePhoto, updateCaption } from "./photos"
import type { PhotoRow } from "@/types/photo"

function sample(id: string, overrides: Partial<PhotoRow> = {}): PhotoRow {
  return {
    id, slug: id, caption: "c", taken_at: 1000 + Number(id.replace(/\D/g, "")) , created_at: 1,
    width: 6000, height: 4000, aspect: 1.5, bytes: 100, format: "jpeg", color_space: null,
    camera_make: null, camera_model: null, lens_model: null, focal_length: null, f_number: null,
    exposure_time: null, iso: null, gps_lat: null, gps_lon: null, gps_alt: null,
    place: null, country: null, country_code: null, thumbhash: null,
    r2_original: `photos/${id}/original.jpg`, r2_large: `photos/${id}/large.webp`,
    r2_thumb: `photos/${id}/thumb.webp`, published: 1, sort_index: null, ...overrides,
  }
}

describe("photos data layer", () => {
  it("inserts with tags, lists newest-first, counts tags", async () => {
    const db = makeTestDb()
    await insertPhoto(db, sample("p1", { taken_at: 100 }), ["norway", "lofoten"])
    await insertPhoto(db, sample("p2", { taken_at: 200 }), ["norway"])
    const all = await listPhotos(db, {})
    expect(all.map((p) => p.row.id)).toEqual(["p2", "p1"])
    expect(all[0].tags).toEqual(["norway"])
    const counts = await listTagCounts(db)
    expect(counts).toContainEqual({ name: "norway", count: 2 })
    expect(counts).toContainEqual({ name: "lofoten", count: 1 })
  })
  it("filters by tag", async () => {
    const db = makeTestDb()
    await insertPhoto(db, sample("p1"), ["norway", "lofoten"])
    await insertPhoto(db, sample("p2"), ["norway"])
    const f = await listPhotos(db, { tag: "lofoten" })
    expect(f.map((p) => p.row.id)).toEqual(["p1"])
  })
  it("gets one with tags", async () => {
    const db = makeTestDb()
    await insertPhoto(db, sample("p1"), ["a", "b"])
    const got = await getPhoto(db, "p1")
    expect(got?.tags.sort()).toEqual(["a", "b"])
  })
  it("updates caption", async () => {
    const db = makeTestDb()
    await insertPhoto(db, sample("p1"), [])
    await updateCaption(db, "p1", "new")
    expect((await getPhoto(db, "p1"))?.row.caption).toBe("new")
  })
  it("deletes and returns r2 keys", async () => {
    const db = makeTestDb()
    await insertPhoto(db, sample("p1"), ["x"])
    const keys = await deletePhoto(db, "p1")
    expect(keys).toEqual(["photos/p1/original.jpg", "photos/p1/large.webp", "photos/p1/thumb.webp"])
    expect(await getPhoto(db, "p1")).toBeNull()
    expect(await listTagCounts(db)).toEqual([]) // orphan tag link gone via cascade
  })
})
