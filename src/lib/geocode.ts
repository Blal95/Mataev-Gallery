export interface GeoResult { place: string | null; country: string | null; countryCode: string | null }

export async function reverseGeocode(lat: number, lon: number, f: typeof fetch = fetch): Promise<GeoResult | null> {
  try {
    const res = await f(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
    if (!res.ok) return null
    const d = (await res.json()) as { city?: string; locality?: string; countryName?: string; countryCode?: string }
    return {
      place: d.city || d.locality || null,
      country: d.countryName || null,
      countryCode: d.countryCode || null,
    }
  } catch {
    return null
  }
}
