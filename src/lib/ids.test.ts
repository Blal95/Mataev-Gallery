import { describe, it, expect } from "vitest"
import { newId, slugify } from "./ids"

describe("ids", () => {
  it("makes a 26-char ULID", () => expect(newId()).toHaveLength(26))
  it("slugifies a caption", () => expect(slugify("Blue hour over the fjord!")).toBe("blue-hour-over-the-fjord"))
  it("falls back when empty", () => expect(slugify("")).toMatch(/^photo-/))
})
