import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { cdnBase } from "@/lib/env"
import { buildPhotosResponse } from "@/lib/api"
import { MosaicGrid } from "@/components/MosaicGrid"
import { TagIndex } from "@/components/TagIndex"
import { EmptyState } from "@/components/EmptyState"

export const dynamic = "force-dynamic"

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const { photos, tags } = await buildPhotosResponse(db(), cdnBase(), { tag })
  if (!tags.some((t) => t.name === tag) && photos.length === 0) notFound()
  return (
    <main>
      <TagIndex tags={tags} active={tag} />
      <div className="pt-3.5">
        {photos.length === 0 ? <EmptyState label="Nothing here yet" /> : <MosaicGrid photos={photos} />}
      </div>
    </main>
  )
}
