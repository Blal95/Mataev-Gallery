import { describe, it, expect } from "vitest"
import { makeTestDb } from "../../test/sqlite-adapter"
import { insertPhoto, listPhotos, getPhoto, listTagCounts, deletePhoto, updatePhoto, setTags } from "./photos"
import { h } from "./photos.test-helpers"

describe("photos data layer", () => {
  it("inserts with tags, lists newest-first, counts tags", async () => {
    const db = makeTestDb()
    await insertPhoto(db, h("p1", { taken_at: 100 }), ["norway", "lofoten"])
    await insertPhoto(db, h("p2", { taken_at: 200 }), ["norway"])
    const all = await listPhotos(db, {})
    expect(all.map((p) => p.row.id)).toEqual(["p2", "p1"])
    expect(all[0].tags).toEqual(["norway"])
    const counts = await listTagCounts(db)
    expect(counts).toContainEqual({ name: "norway", count: 2 })
    expect(counts).toContainEqual({ name: "lofoten", count: 1 })
  })
  it("filters by tag", async () => {
    const db = makeTestDb()
    await insertPhoto(db, h("p1"), ["norway", "lofoten"])
    await insertPhoto(db, h("p2"), ["norway"])
    const f = await listPhotos(db, { tag: "lofoten" })
    expect(f.map((p) => p.row.id)).toEqual(["p1"])
  })
  it("gets one with tags", async () => {
    const db = makeTestDb()
    await insertPhoto(db, h("p1"), ["a", "b"])
    const got = await getPhoto(db, "p1")
    expect(got?.tags.sort()).toEqual(["a", "b"])
  })
  it("deletes and returns r2 keys", async () => {
    const db = makeTestDb()
    await insertPhoto(db, h("p1"), ["x"])
    const keys = await deletePhoto(db, "p1")
    expect(keys).toEqual(["photos/p1/original.jpg", "photos/p1/large.webp", "photos/p1/thumb.webp"])
    expect(await getPhoto(db, "p1")).toBeNull()
    expect(await listTagCounts(db)).toEqual([]) // orphan tag link gone via cascade
  })
  it("updates fields and replaces tags", async () => {
    const db = makeTestDb()
    await insertPhoto(db, h("p1"), ["old"])
    await updatePhoto(db, "p1", { caption: "x", published: 1 })
    await setTags(db, "p1", ["new1", "new2"])
    expect((await getPhoto(db, "p1"))?.tags.sort()).toEqual(["new1", "new2"])
    expect(await listTagCounts(db)).not.toContainEqual({ name: "old", count: 1 })
  })
})
