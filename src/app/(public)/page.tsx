import { db } from "@/lib/db"
import { buildPhotosResponse } from "@/lib/api"
import { GalleryFeed } from "@/components/GalleryFeed"
import { TagIndex } from "@/components/TagIndex"
import { EmptyState } from "@/components/EmptyState"
import { PAGE_SIZE } from "@/config/site"

export const dynamic = "force-dynamic"

export default async function Home() {
  const { photos, tags, nextOffset } = await buildPhotosResponse(await db(), { limit: PAGE_SIZE, offset: 0 })
  return (
    <main>
      <TagIndex tags={tags} />
      <div className="pt-3.5">
        {photos.length === 0 ? (
          <EmptyState label="No photos yet" />
        ) : (
          <GalleryFeed initialPhotos={photos} initialNextOffset={nextOffset ?? null} />
        )}
      </div>
    </main>
  )
}
