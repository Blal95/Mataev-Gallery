import { describe, it, expect } from "vitest"
import { staticMapUrl } from "./maptiler"

describe("staticMapUrl", () => {
  it("builds a dark static map url with pin + key", () => {
    const u = staticMapUrl({ lat: 68.21, lon: 13.62, zoom: 9, w: 240, h: 160, key: "K" })
    expect(u).toContain("/maps/streets-v2-dark/static/")
    expect(u).toContain("13.62,68.21,9")
    expect(u).toContain("240x160")
    expect(u).toContain("key=K")
  })
  it("returns null without coords", () => {
    expect(staticMapUrl({ lat: null, lon: null, zoom: 9, w: 10, h: 10, key: "K" })).toBeNull()
  })
})
