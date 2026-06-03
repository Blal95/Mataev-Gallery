import { describe, it, expect } from "vitest"
import { formatExposure, formatBytes, formatAperture, formatFocal, flagUrl, formatCamera } from "./format"

describe("format", () => {
  it("formats fast shutter as 1/x", () => expect(formatExposure(0.004)).toBe("1/250"))
  it("formats slow shutter as seconds", () => expect(formatExposure(2)).toBe("2s"))
  it("formats sub-second >= 1/4 as seconds", () => expect(formatExposure(0.5)).toBe("0.5s"))
  it("returns null for missing exposure", () => expect(formatExposure(null)).toBeNull())
  it("formats bytes", () => { expect(formatBytes(8810000)).toBe("8.4 MB"); expect(formatBytes(900)).toBe("900 B") })
  it("formats aperture", () => expect(formatAperture(2.8)).toBe("ƒ2.8"))
  it("formats focal", () => expect(formatFocal(35)).toBe("35mm"))
  it("maps country code to flag URL", () => expect(flagUrl("NO")).toBe("https://flagcdn.com/32x24/no.png"))
  it("returns null for null", () => expect(flagUrl(null)).toBeNull())
  it("joins camera make + model without duplication", () => {
    expect(formatCamera("Apple", "iPhone 15 Pro Max")).toBe("Apple iPhone 15 Pro Max")
    expect(formatCamera("SONY", "SONY ILCE-7M4")).toBe("SONY ILCE-7M4")
    expect(formatCamera(null, null)).toBeNull()
  })
})
