import exifr from "exifr"

export interface ExtractedExif {
  takenAt: number | null; cameraMake: string | null; cameraModel: string | null; lens: string | null
  focal: number | null; fNumber: number | null; exposure: number | null; iso: number | null
  lat: number | null; lon: number | null; alt: number | null; colorSpace: string | null
}

export async function extractExif(file: File): Promise<ExtractedExif> {
  const x = (await exifr.parse(file, { tiff: true, exif: true, gps: true, iptc: false, xmp: false, jfif: false }).catch(() => null)) ?? {}
  const taken = x.DateTimeOriginal ?? x.CreateDate
  return {
    takenAt: taken ? new Date(taken).getTime() : null,
    cameraMake: x.Make ?? null, cameraModel: x.Model ?? null, lens: x.LensModel ?? null,
    focal: x.FocalLength ?? null, fNumber: x.FNumber ?? null,
    exposure: x.ExposureTime ?? null, iso: x.ISO ?? null,
    lat: x.latitude ?? null, lon: x.longitude ?? null, alt: x.GPSAltitude ?? null,
    colorSpace: x.ColorSpace === 1 ? "sRGB" : x.ColorSpace ? String(x.ColorSpace) : null,
  }
}
