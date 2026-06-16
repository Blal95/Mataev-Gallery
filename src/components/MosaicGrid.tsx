import { PhotoTile } from "./PhotoTile"
import type { PhotoDTO } from "@/types/photo"

/**
 * CSS multi-column masonry. No JS measurement — markup identical on server
 * and client, so first paint includes all tiles. Column count mirrors
 * breakpoints: 2 / 3 / 4 / 5 at sm / lg / xl.
 */
export function MosaicGrid({ photos }: { photos: PhotoDTO[] }) {
  return (
    <div className="columns-2 gap-2 px-4 sm:columns-3 sm:gap-3.5 sm:px-5 lg:columns-4 xl:columns-5">
      {photos.map((photo, i) => (
        <div key={photo.id} className="mb-2 break-inside-avoid sm:mb-3.5">
          <PhotoTile photo={photo} index={i} priority={i < 12} />
        </div>
      ))}
    </div>
  )
}
