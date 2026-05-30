export function staticMapUrl(opts: {
  lat: number | null; lon: number | null; zoom: number; w: number; h: number; key: string
}): string | null {
  const { lat, lon, zoom, w, h, key } = opts
  if (lat == null || lon == null || !key) return null
  const center = `${lon},${lat},${zoom}`
  const marker = `${lon},${lat}`
  return `https://api.maptiler.com/maps/streets-v2-dark/static/${center}/${w}x${h}@2x.png?markers=${marker}&key=${key}`
}
