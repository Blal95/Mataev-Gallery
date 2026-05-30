import type { PhotoRow, PhotoDTO } from "@/types/photo"
import { formatCamera } from "./format"

export function rowToDTO(row: PhotoRow, tags: string[], cdnBase: string): PhotoDTO {
  const url = (key: string) => `${cdnBase}/${key}`
  return {
    id: row.id,
    slug: row.slug,
    url: { thumb: url(row.r2_thumb), large: url(row.r2_large), original: url(row.r2_original) },
    width: row.width, height: row.height, aspect: row.aspect,
    thumbhash: row.thumbhash,
    caption: row.caption, takenAt: row.taken_at,
    place: row.place, country: row.country, countryCode: row.country_code,
    lat: row.gps_lat, lon: row.gps_lon,
    camera: formatCamera(row.camera_make, row.camera_model), lens: row.lens_model,
    focal: row.focal_length, fNumber: row.f_number, exposure: row.exposure_time, iso: row.iso,
    bytes: row.bytes, format: row.format,
    tags,
  }
}
