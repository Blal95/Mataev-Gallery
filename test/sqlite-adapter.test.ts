import { describe, it, expect } from "vitest"
import { makeTestDb } from "./sqlite-adapter"

describe("sqlite adapter", () => {
  it("applies the migration and exposes the photos table", async () => {
    const db = makeTestDb()
    await db.prepare("INSERT INTO tags (name) VALUES (?)").bind("norway").run()
    const row = await db.prepare("SELECT name FROM tags WHERE name = ?").bind("norway").first<{ name: string }>()
    expect(row?.name).toBe("norway")
  })
})
