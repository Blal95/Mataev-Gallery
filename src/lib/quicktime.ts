/**
 * GPS extraction from QuickTime/MP4 containers (iPhone .mov/.mp4).
 *
 * iPhone footage stores location as an ISO 6709 string, either in the
 * `com.apple.quicktime.location.ISO6709` ilst entry or a legacy `©xyz`
 * udta atom. Rather than walking the atom tree, scan the bytes for the
 * ISO 6709 token — it is strict enough (signed degrees ×2 + terminating
 * slash) that random video bitstream doesn't produce false positives,
 * and it covers both storage forms.
 */

export interface VideoGps { lat: number; lon: number; alt: number | null }

const ISO6709 = /[+-]\d{1,3}\.\d+[+-]\d{1,3}\.\d+(?:[+-]\d+(?:\.\d+)?)?(?:CRS[A-Za-z0-9_]*)?\//g

/** Parse an ISO 6709 string like "+45.4746+009.1765+130.849/". */
export function parseIso6709(s: string): VideoGps | null {
  const m = /^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)?/.exec(s)
  if (!m) return null
  const lat = parseFloat(m[1])
  const lon = parseFloat(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  if (lat === 0 && lon === 0) return null
  return { lat, lon, alt: m[3] != null ? parseFloat(m[3]) : null }
}

// Byte-preserving decode without TextDecoder("latin1"), which some Worker
// runtimes don't ship; the ISO 6709 token is pure ASCII so this is enough.
function latin1(bytes: Uint8Array): string {
  let s = ""
  const CHUNK = 32768
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)))
  }
  return s
}

/** Scan raw container bytes for a plausible ISO 6709 location value. */
export function findVideoGps(bytes: Uint8Array): VideoGps | null {
  const text = latin1(bytes)
  for (const m of text.matchAll(ISO6709)) {
    const gps = parseIso6709(m[0])
    if (gps) return gps
  }
  return null
}

const QT_DATE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})/

/**
 * Capture time from the `com.apple.quicktime.creationdate` metadata entry.
 * Only trusted when the key name itself is present in the scanned bytes —
 * a bare ISO 8601 match elsewhere in the bitstream could be anything.
 */
export function findVideoCreationDate(bytes: Uint8Array): number | null {
  const text = latin1(bytes)
  const anchor = text.indexOf("com.apple.quicktime.creationdate")
  if (anchor < 0) return null
  const m = QT_DATE.exec(text.slice(anchor, anchor + 4096))
  if (!m) return null
  const t = Date.parse(m[0])
  if (!Number.isFinite(t)) return null
  const year = new Date(t).getUTCFullYear()
  return year >= 2000 && year <= 2100 ? t : null
}
