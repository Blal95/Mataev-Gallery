import { PhotoTile } from "./PhotoTile"
import type { PhotoDTO } from "@/types/photo"

/**
 * CSS multi-column masonry. Pure CSS — the markup is identical on server and
 * client, so the first server-rendered paint already contains every <img>.
 * No JS width measurement, so thumbnails paint as their bytes arrive instead
 * of waiting for hydration. Column count mirrors `columnsForWidth`
 * (2 / 3 / 4 / 5 at 640 / 1024 / 1440). Fill order is column-major.
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
