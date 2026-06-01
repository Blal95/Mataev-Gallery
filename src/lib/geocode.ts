export interface GeoResult { place: string | null; country: string | null; countryCode: string | null }

export interface GeoSearchHit {
  lat: number
  lon: number
  label: string
  place: string | null
  country: string | null
  countryCode: string | null
}

export async function forwardGeocode(query: string, f: typeof fetch = fetch): Promise<GeoSearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`
    const res = await f(url, { headers: { "User-Agent": "MataevGallery/1.0 (admin location picker)" } })
    if (!res.ok) return []
    const rows = (await res.json()) as {
      lat: string
      lon: string
      display_name: string
      address?: { city?: string; town?: string; village?: string; locality?: string; country?: string; country_code?: string }
    }[]
    return rows.map((r) => {
      const a = r.address
      const place = a?.city || a?.town || a?.village || a?.locality || null
      const country = a?.country || null
      const countryCode = a?.country_code?.toUpperCase() ?? null
      const label = [place, country].filter(Boolean).join(", ") || r.display_name
      return {
        lat: Number(r.lat),
        lon: Number(r.lon),
        label,
        place,
        country,
        countryCode,
      }
    })
  } catch {
    return []
  }
}

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
