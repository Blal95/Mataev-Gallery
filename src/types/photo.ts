export interface PhotoRow {
  id: string; slug: string; caption: string | null
  taken_at: number | null; created_at: number
  width: number; height: number; aspect: number
  bytes: number; format: string; color_space: string | null
  camera_make: string | null; camera_model: string | null; lens_model: string | null
  focal_length: number | null; f_number: number | null; exposure_time: number | null; iso: number | null
  gps_lat: number | null; gps_lon: number | null; gps_alt: number | null
  place: string | null; country: string | null; country_code: string | null
  thumbhash: string | null
  r2_original: string; r2_large: string; r2_thumb: string
  published: number; sort_index: number | null
}

export interface PhotoDTO {
  id: string; slug: string
  url: { thumb: string; large: string; original: string }
  width: number; height: number; aspect: number
  thumbhash: string | null
  caption: string | null; takenAt: number | null
  place: string | null; country: string | null; countryCode: string | null
  lat: number | null; lon: number | null
  camera: string | null; lens: string | null
  focal: number | null; fNumber: number | null; exposure: number | null; iso: number | null
  bytes: number; format: string
  tags: string[]
}

export interface TagCount { name: string; count: number }
export interface PhotosResponse { photos: PhotoDTO[]; tags: TagCount[] }
