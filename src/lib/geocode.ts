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
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1`
    const res = await f(url, { headers: { "User-Agent": "MataevGallery/1.0 (admin location picker)" } })
    if (!res.ok) return []
    const rows = (await res.json()) as {
      lat: string
      lon: string
      name: string
      display_name: string
      address?: {
        amenity?: string; tourism?: string; railway?: string; aeroway?: string
        historic?: string; leisure?: string; shop?: string; building?: string
        city?: string; town?: string; village?: string; locality?: string; suburb?: string
        country?: string; country_code?: string
      }
    }[]
    return rows.map((r) => {
      const a = r.address ?? {}
      // Specific venue/POI name from any address category
      const specific = a.amenity || a.tourism || a.railway || a.aeroway ||
        a.historic || a.leisure || a.shop || a.building || null
      // Administrative city level
      const city = a.city || a.town || a.village || a.locality || null
      const country = a.country || null
      const countryCode = a.country_code?.toUpperCase() ?? null
      // place = specific name if it's a named POI, else city
      const place = specific || r.name || city
      // label shown in dropdown: specific name + city + country
      const labelParts = [specific || r.name, city, country].filter(Boolean)
      const label = labelParts.length > 0 ? labelParts.join(", ") : r.display_name
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
