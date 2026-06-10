export interface GeoResult { place: string | null; country: string | null; countryCode: string | null }

export interface GeoSearchHit {
  lat: number
  lon: number
  label: string
  address: string | null
  place: string | null
  country: string | null
  countryCode: string | null
}

export async function forwardGeocode(query: string, f: typeof fetch = fetch): Promise<GeoSearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1&accept-language=en`
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
      // label shown in dropdown: specific name + city + country (deduped —
      // a station named after its city would otherwise repeat it)
      const labelParts = [...new Set([specific || r.name, city, country].filter(Boolean))]
      const label = labelParts.length > 0 ? labelParts.join(", ") : r.display_name
      return {
        lat: Number(r.lat),
        lon: Number(r.lon),
        label,
        address: r.display_name || null,
        place,
        country,
        countryCode,
      }
    })
  } catch {
    return []
  }
}

async function reverseBigDataCloud(lat: number, lon: number, f: typeof fetch): Promise<GeoResult | null> {
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

async function reverseNominatim(lat: number, lon: number, f: typeof fetch): Promise<GeoResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=14&accept-language=en`
    const res = await f(url, { headers: { "User-Agent": "MataevGallery/1.0 (gallery.mataev.no)" } })
    if (!res.ok) return null
    const d = (await res.json()) as {
      address?: {
        city?: string; town?: string; village?: string; suburb?: string
        municipality?: string; county?: string; country?: string; country_code?: string
      }
    }
    const a = d.address ?? {}
    const place = a.city || a.town || a.village || a.suburb || a.municipality || a.county || null
    const country = a.country || null
    if (!place && !country) return null
    return { place, country, countryCode: a.country_code?.toUpperCase() ?? null }
  } catch {
    return null
  }
}

/**
 * Reverse geocode with a provider fallback chain. The bigdatacloud client
 * endpoint silently falls back to IP-based lookup on bad input, so refuse
 * non-finite coords up front; when it returns nothing useful, retry via
 * Nominatim before giving up.
 */
export async function reverseGeocode(lat: number, lon: number, f: typeof fetch = fetch): Promise<GeoResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const primary = await reverseBigDataCloud(lat, lon, f)
  if (primary && (primary.place || primary.country)) return primary
  return reverseNominatim(lat, lon, f)
}

/** Full street-level address line for a coordinate (Nominatim display_name). */
export async function reverseGeocodeAddress(lat: number, lon: number, f: typeof fetch = fetch): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&accept-language=en`
    const res = await f(url, { headers: { "User-Agent": "MataevGallery/1.0 (gallery.mataev.no)" } })
    if (!res.ok) return null
    const d = (await res.json()) as { display_name?: string }
    return d.display_name || null
  } catch {
    return null
  }
}
