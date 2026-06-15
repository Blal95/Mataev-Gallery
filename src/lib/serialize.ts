import type { PhotoRow, PhotoDTO } from "@/types/photo"
import { formatCamera } from "./format"

export function rowToDTO(row: PhotoRow, tags: string[], cdnBase: string): PhotoDTO {
  return {
    id: row.id,
    slug: row.slug,
    url: {
      thumb: `${cdnBase}/${row.r2_thumb}`,
      large: `${cdnBase}/${row.r2_large}`,
      original: `${cdnBase}/${row.r2_original}`,
    },
    width: row.width, height: row.height, aspect: row.aspect,
    thumbhash: row.thumbhash,
    caption: row.caption, takenAt: row.taken_at,
    place: row.place, country: row.country, countryCode: row.country_code,
    lat: row.gps_lat, lon: row.gps_lon,
    camera: formatCamera(row.camera_make, row.camera_model), lens: row.lens_model,
    focal: row.focal_length, fNumber: row.f_number, exposure: row.exposure_time, iso: row.iso,
    bytes: row.bytes, format: row.format,
    published: row.published === 1,
    visibility: (row.published === 0 ? 0 : row.published === 2 ? 2 : 1) as 0 | 1 | 2,
    tags,
    mediaType: row.media_type === 'video' ? 'video' : 'photo',
    duration: row.duration,
    views: row.views ?? 0,
  }
}
