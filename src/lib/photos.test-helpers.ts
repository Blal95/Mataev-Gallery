import type { PhotoRow } from "@/types/photo"

export function h(id: string, overrides: Partial<PhotoRow> = {}): PhotoRow {
  return {
    id, slug: id, caption: "c", taken_at: 1000 + Number(id.replace(/\D/g, "")), created_at: 1,
    width: 6000, height: 4000, aspect: 1.5, bytes: 100, format: "jpeg", color_space: null,
    camera_make: null, camera_model: null, lens_model: null, focal_length: null, f_number: null,
    exposure_time: null, iso: null, gps_lat: null, gps_lon: null, gps_alt: null,
    place: null, country: null, country_code: null, thumbhash: null,
    r2_original: `photos/${id}/original.jpg`, r2_large: `photos/${id}/large.webp`,
    r2_thumb: `photos/${id}/thumb.webp`, published: 1, sort_index: null,
    media_type: "photo", duration: null, views: 0,
    ...overrides,
  }
}
