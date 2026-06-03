import { db } from "@/lib/db"
import { cdnBase } from "@/lib/env"
import { getDetail } from "@/lib/detail"
import { PhotoDetail } from "@/components/PhotoDetail"
import { ModalShell } from "@/components/ModalShell"

export const dynamic = "force-dynamic"

export default async function PhotoModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getDetail(await db(), await cdnBase(), id)
  if (!data) return null
  return (
    <ModalShell>
      <PhotoDetail {...data} asModal />
    </ModalShell>
  )
}
