import { formatExposure, formatAperture, formatFocal, formatBytes } from "@/lib/format"
import type { PhotoDTO } from "@/types/photo"

export function ExposureStrip({ photo }: { photo: PhotoDTO }) {
  const gearParts = [photo.camera, photo.lens].filter(Boolean) as string[]
  const exposureParts = [
    formatFocal(photo.focal),
    formatAperture(photo.fNumber),
    formatExposure(photo.exposure),
    photo.iso != null ? `ISO ${photo.iso}` : null,
  ].filter(Boolean) as string[]
  const techParts = [
    photo.width > 0 ? `${photo.width}×${photo.height}` : null,
    formatBytes(photo.bytes),
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-1.5 font-mono text-[10px] uppercase tracking-[0.08em]">
      {gearParts.map((g, i) => (
        <div key={i} className="leading-snug text-muted-2">{g}</div>
      ))}
      {exposureParts.length > 0 && (
        <div className="leading-snug text-cyan">{exposureParts.join(" · ")}</div>
      )}
      {techParts.length > 0 && (
        <div className="leading-snug text-muted">{techParts.join(" · ")}</div>
      )}
    </div>
  )
}
