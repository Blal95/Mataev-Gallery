import { describe, it, expect } from "vitest"
import { makeTestDb } from "../../test/sqlite-adapter"
import { insertPhoto } from "./photos"
import { h } from "./photos.test-helpers"
import { countRecentByIp, insertComment, listComments } from "./comments"

describe("comments", () => {
  it("lists and inserts comments for a photo", async () => {
    const db = makeTestDb()
    await insertPhoto(db, h("p1"), [])
    const c = await insertComment(db, "p1", "Ada", "Beautiful light.", "iphash1")
    expect(c.author).toBe("Ada")
    const list = await listComments(db, "p1")
    expect(list).toHaveLength(1)
    expect(list[0].body).toBe("Beautiful light.")
  })

  it("counts recent comments by ip hash", async () => {
    const db = makeTestDb()
    await insertPhoto(db, h("p1"), [])
    const since = Date.now() - 3600_000
    await insertComment(db, "p1", "A", "one", "hash-a")
    await insertComment(db, "p1", "B", "two", "hash-a")
    expect(await countRecentByIp(db, "hash-a", since)).toBe(2)
    expect(await countRecentByIp(db, "hash-b", since)).toBe(0)
  })
})
