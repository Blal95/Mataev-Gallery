export function formatExposure(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null
  if (seconds >= 1) return `${seconds}s`
  if (seconds >= 0.25) return `${seconds}s`
  return `1/${Math.round(1 / seconds)}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatAperture(f: number | null): string | null {
  if (f == null) return null
  // EXIF apertures are often noisy floats (e.g. 1.7799999); show ≤1 decimal.
  return `ƒ${parseFloat(f.toFixed(1))}`
}

export function formatFocal(mm: number | null): string | null {
  return mm == null ? null : `${Math.round(mm)}mm`
}

// Chechnya (Ichkeria) bounding box — show Ichkeria flag instead of Russian flag
export function isInChechnya(lat: number | null | undefined, lon: number | null | undefined): boolean {
  if (lat == null || lon == null) return false
  return lat >= 42.5 && lat <= 43.8 && lon >= 44.8 && lon <= 47.0
}

export function flagUrl(code: string | null, lat?: number | null, lon?: number | null): string | null {
  if (code === "RU" && isInChechnya(lat, lon)) return "/ichkeria.png"
  if (!code || code.length !== 2) return null
  return `https://flagcdn.com/32x24/${code.toLowerCase()}.png`
}

export function displayCountry(country: string | null, code: string | null, lat?: number | null, lon?: number | null): string | null {
  if (code === "RU" && isInChechnya(lat, lon)) return "Chechnya"
  return country
}

export function flagEmoji(code: string | null, lat?: number | null, lon?: number | null): string | null {
  if (code === "RU" && isInChechnya(lat, lon)) return null
  if (!code || code.length !== 2) return null
  const offset = 0x1F1E6 - 65
  return [...code.toUpperCase()].map(c => String.fromCodePoint(c.codePointAt(0)! + offset)).join("")
}

export function formatDuration(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

export function formatCamera(make: string | null, model: string | null): string | null {
  if (!model && !make) return null
  if (!model) return make
  if (!make) return model
  return model.toUpperCase().startsWith(make.toUpperCase()) ? model : `${make} ${model}`
}
