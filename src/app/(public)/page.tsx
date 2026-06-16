import { db } from "@/lib/db"
import { cdnBase } from "@/lib/env"
import { buildPhotosResponse } from "@/lib/api"
import { GalleryFeed } from "@/components/GalleryFeed"
import { TagIndex } from "@/components/TagIndex"
import { EmptyState } from "@/components/EmptyState"
import { PAGE_SIZE } from "@/config/site"

export const revalidate = 3600

export default async function Home() {
  const [database, base] = await Promise.all([db(), cdnBase()])
  const { photos, tags, nextOffset } = await buildPhotosResponse(database, { limit: PAGE_SIZE, offset: 0 }, base)

  let cdnOrigin: string | null = null
  try { cdnOrigin = new URL(base).origin } catch { /* ignore */ }

  return (
    <>
      {cdnOrigin && <link rel="preconnect" href={cdnOrigin} crossOrigin="anonymous" />}
      {cdnOrigin && <link rel="dns-prefetch" href={cdnOrigin} />}
      {/* Hero loads large.webp — preload it at high priority */}
      {photos.slice(0, 12).map((p) => (
        <link key={p.id} rel="preload" as="image" href={p.url.thumb} fetchPriority="high" />
      ))}
      {photos.slice(12, 24).map((p) => (
        <link key={p.id} rel="preload" as="image" href={p.url.thumb} fetchPriority="low" />
      ))}
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
    </>
  )
}
