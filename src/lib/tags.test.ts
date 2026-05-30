import { describe, it, expect } from "vitest"
import { normalizeTag, parseTags } from "./tags"

describe("tags", () => {
  it("normalizes case, strips #, spaces to dashes", () => {
    expect(normalizeTag("#Blue Hour")).toBe("blue-hour")
    expect(normalizeTag("Lofoten")).toBe("lofoten")
  })
  it("drops invalid chars", () => expect(normalizeTag("a*b!c")).toBe("abc"))
  it("parses a #-separated string into unique normalized tags", () => {
    expect(parseTags("#norway #Lofoten #norway #blue hour")).toEqual(["norway", "lofoten", "blue-hour"])
  })
  it("returns [] for empty", () => expect(parseTags("   ")).toEqual([]))
})
