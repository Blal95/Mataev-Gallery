import { describe, it, expect } from "vitest"
import { rowToDTO } from "./serialize"
import type { PhotoRow } from "@/types/photo"

const row: PhotoRow = {
  id: "01J", slug: "blue-hour", caption: "still water",
  taken_at: 1755112440000, created_at: 1755112450000,
  width: 6000, height: 4000, aspect: 1.5, bytes: 8810000, format: "jpeg",
  color_space: "Display P3", camera_make: "SONY", camera_model: "ILCE-7M4",
  lens_model: "FE 24-70 GM", focal_length: 35, f_number: 2.8, exposure_time: 0.004, iso: 100,
  gps_lat: 68.21, gps_lon: 13.62, gps_alt: 12, place: "Lofoten", country: "Norway", country_code: "NO",
  thumbhash: "abc", r2_original: "photos/01J/original.jpg",
  r2_large: "photos/01J/large.webp", r2_thumb: "photos/01J/thumb.webp",
  published: 1, sort_index: null,
  media_type: "photo", duration: null, views: 0,
}

const CDN = "https://cdn.test"

describe("rowToDTO", () => {
  it("emits CDN image URLs from R2 keys and camelCase fields", () => {
    const dto = rowToDTO(row, ["norway", "lofoten"], CDN)
    expect(dto.url.thumb).toBe("https://cdn.test/photos/01J/thumb.webp")
    expect(dto.url.large).toBe("https://cdn.test/photos/01J/large.webp")
    expect(dto.url.original).toBe("https://cdn.test/photos/01J/original.jpg")
    expect(dto.camera).toBe("SONY ILCE-7M4")
    expect(dto.fNumber).toBe(2.8)
    expect(dto.countryCode).toBe("NO")
    expect(dto.tags).toEqual(["norway", "lofoten"])
  })

  it("sets mediaType to 'photo' and duration null by default", () => {
    const dto = rowToDTO({ ...row, media_type: "photo", duration: null }, [], CDN)
    expect(dto.mediaType).toBe("photo")
    expect(dto.duration).toBeNull()
  })

  it("maps video row to mediaType video and duration", () => {
    const dto = rowToDTO({ ...row, media_type: "video", duration: 12.4 }, [], CDN)
    expect(dto.mediaType).toBe("video")
    expect(dto.duration).toBe(12.4)
  })
})
