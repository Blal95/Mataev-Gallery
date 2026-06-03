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

export function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return ""
  const A = 0x1f1e6
  const up = code.toUpperCase()
  return String.fromCodePoint(A + (up.charCodeAt(0) - 65), A + (up.charCodeAt(1) - 65))
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
