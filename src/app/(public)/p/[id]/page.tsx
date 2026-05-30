import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { cdnBase, cf } from "@/lib/env"
import { getDetail } from "@/lib/detail"
import { PhotoDetail } from "@/components/PhotoDetail"

export const dynamic = "force-dynamic"

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getDetail(db(), cdnBase(), id)
  if (!data) notFound()
  const mapKey = cf().NEXT_PUBLIC_MAPTILER_KEY ?? ""
  return <PhotoDetail {...data} mapKey={mapKey} asModal={false} />
}
