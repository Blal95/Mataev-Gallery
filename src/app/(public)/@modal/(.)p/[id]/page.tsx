import { db } from "@/lib/db"
import { cdnBase, cf } from "@/lib/env"
import { getDetail } from "@/lib/detail"
import { PhotoDetail } from "@/components/PhotoDetail"
import { ModalShell } from "@/components/ModalShell"

export const dynamic = "force-dynamic"

export default async function PhotoModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getDetail(db(), cdnBase(), id)
  if (!data) return null
  const mapKey = cf().NEXT_PUBLIC_MAPTILER_KEY ?? ""
  return (
    <ModalShell>
      <PhotoDetail {...data} mapKey={mapKey} asModal />
    </ModalShell>
  )
}
