import { formatExposure, formatAperture, formatFocal, formatBytes } from "@/lib/format"
import type { PhotoDTO } from "@/types/photo"

function Dot() { return <span className="text-muted">·</span> }

export function ExposureStrip({ photo }: { photo: PhotoDTO }) {
  const cyan = (s: string | null) => (s ? <span className="text-cyan">{s}</span> : null)
  const parts: React.ReactNode[] = []
  const push = (n: React.ReactNode) => n && parts.push(n)
  push(photo.camera && <span>{photo.camera}</span>)
  push(photo.lens && <span>{photo.lens}</span>)
  push(formatFocal(photo.focal))
  push(cyan(formatAperture(photo.fNumber)))
  push(cyan(formatExposure(photo.exposure)))
  push(photo.iso != null && cyan(`ISO ${photo.iso}`))
  push(<span>{photo.width}×{photo.height}</span>)
  push(<span>{formatBytes(photo.bytes)}</span>)

  return (
    <div className="font-mono text-[10px] uppercase leading-[1.9] tracking-[0.08em] text-muted-2">
      {parts.map((p, i) => (
        <span key={i}>{i > 0 && <> <Dot /> </>}{p}</span>
      ))}
    </div>
  )
}
