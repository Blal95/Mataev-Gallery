import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { cdnBase } from "@/lib/env"
import { buildPhotosResponse } from "@/lib/api"
import { GalleryFeed } from "@/components/GalleryFeed"
import { TagIndex } from "@/components/TagIndex"
import { EmptyState } from "@/components/EmptyState"
import { PAGE_SIZE } from "@/config/site"

export const revalidate = 0

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const base = await cdnBase()
  const { photos, tags, nextOffset } = await buildPhotosResponse(await db(), { tag, limit: PAGE_SIZE, offset: 0 }, base)
  if (!tags.some((t) => t.name === tag) && photos.length === 0) notFound()

  let cdnOrigin: string | null = null
  try { cdnOrigin = new URL(base).origin } catch { /* ignore */ }

  return (
    <>
      {cdnOrigin && <link rel="preconnect" href={cdnOrigin} crossOrigin="anonymous" />}
      {cdnOrigin && <link rel="dns-prefetch" href={cdnOrigin} />}
      {photos.slice(0, 6).map((p) => (
        <link key={p.id} rel="preload" as="image" href={p.url.thumb} fetchPriority="high" />
      ))}
      {photos.slice(6, 24).map((p) => (
        <link key={p.id} rel="preload" as="image" href={p.url.thumb} fetchPriority="low" />
      ))}
    <main>
      <TagIndex tags={tags} active={tag} />
      <div className="pt-3.5">
        {photos.length === 0 ? (
          <EmptyState label="Nothing here yet" />
        ) : (
          <GalleryFeed initialPhotos={photos} initialNextOffset={nextOffset ?? null} tag={tag} />
        )}
      </div>
    </main>
    </>
  )
}
