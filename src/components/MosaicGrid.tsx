import { PhotoTile } from "./PhotoTile"
import type { PhotoDTO } from "@/types/photo"

/**
 * CSS Grid gallery. Each photo occupies a stable numbered cell — no
 * column rebalancing on scroll/load, so photos never visually reorder.
 * SSR-renderable: no JS measurement needed.
 */
export function MosaicGrid({ photos }: { photos: PhotoDTO[] }) {
  return (
    <div className="grid grid-cols-2 items-start gap-2 px-4 sm:grid-cols-3 sm:gap-3.5 sm:px-5 lg:grid-cols-4 xl:grid-cols-5">
      {photos.map((photo, i) => (
        <PhotoTile key={photo.id} photo={photo} index={i} priority={i < 12} />
      ))}
    </div>
  )
}
