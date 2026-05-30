import { db } from "@/lib/db"
import { cdnBase } from "@/lib/env"
import { buildPhotosResponse } from "@/lib/api"
import { MosaicGrid } from "@/components/MosaicGrid"
import { TagIndex } from "@/components/TagIndex"
import { EmptyState } from "@/components/EmptyState"

export const dynamic = "force-dynamic"

export default async function Home() {
  const { photos, tags } = await buildPhotosResponse(db(), cdnBase(), {})
  return (
    <main>
      <TagIndex tags={tags} />
      <div className="pt-3.5">
        {photos.length === 0 ? <EmptyState label="No photos yet" /> : <MosaicGrid photos={photos} />}
      </div>
    </main>
  )
}
