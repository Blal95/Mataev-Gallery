import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { db } from "@/lib/db"
import { cdnBase, cf } from "@/lib/env"
import { getDetail } from "@/lib/detail"
import { PhotoDetail } from "@/components/PhotoDetail"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params
    const data = await getDetail(db(), cdnBase(), id)
    if (!data) {
      return { title: "Not Found — MATAEV" }
    }
    const { photo } = data
    const parts: string[] = []
    if (photo.place) parts.push(photo.place)
    if (photo.camera) parts.push(photo.camera)
    if (photo.takenAt) {
      parts.push(new Date(photo.takenAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }))
    }
    const description = parts.length > 0 ? parts.join(" · ") : "Photograph by Bilal R. Mataev."
    const title = `${photo.caption || "Photo"} — MATAEV`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        images: [{ url: photo.url.large, width: photo.width, height: photo.height }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [photo.url.large],
      },
    }
  } catch {
    return { title: "MATAEV — Photography" }
  }
}

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getDetail(db(), cdnBase(), id)
  if (!data) notFound()
  const mapKey = cf().NEXT_PUBLIC_MAPTILER_KEY ?? ""
  return <PhotoDetail {...data} mapKey={mapKey} asModal={false} />
}
