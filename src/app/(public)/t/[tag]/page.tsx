import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { cdnBase } from "@/lib/env"
import { buildPhotosResponse } from "@/lib/api"
import { GalleryFeed } from "@/components/GalleryFeed"
import { TagIndex } from "@/components/TagIndex"
import { EmptyState } from "@/components/EmptyState"
import { PAGE_SIZE } from "@/config/site"

export const dynamic = "force-dynamic"

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const { photos, tags, nextOffset } = await buildPhotosResponse(db(), cdnBase(), { tag, limit: PAGE_SIZE, offset: 0 })
  if (!tags.some((t) => t.name === tag) && photos.length === 0) notFound()
  return (
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
  )
}
