import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { db } from "@/lib/db"
import { getDetail } from "@/lib/detail"
import { PhotoDetail } from "@/components/PhotoDetail"

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params
    const data = await getDetail(await db(), id)
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
    // Note: og/twitter images are intentionally omitted here. Next.js then
    // falls back to the generated opengraph-image.tsx (the print-stamp card:
    // photo + tower seal + EXIF). Setting images explicitly would override
    // and suppress that file convention.
    return {
      title,
      description,
      openGraph: { title, description, type: "article" },
      twitter: { card: "summary_large_image", title, description },
    }
  } catch {
    return { title: "MATAEV — Photography" }
  }
}

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const database = await db()
  const data = await getDetail(database, id)
  if (!data) notFound()
  const { photo } = data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "url": `https://gallery.mataev.no/image/${photo.slug}`,
    "contentUrl": photo.url.original,
    "thumbnailUrl": photo.url.thumb,
    "name": photo.caption ?? "Photograph",
    "author": { "@type": "Person", "name": "Bilal R. Mataev" },
    ...(photo.takenAt ? { "dateCreated": new Date(photo.takenAt).toISOString() } : {}),
    ...(photo.place ? { "contentLocation": { "@type": "Place", "name": photo.place } } : {}),
    ...(photo.width && photo.height ? { "width": photo.width, "height": photo.height } : {}),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="fixed inset-0 z-50 overflow-hidden">
        <PhotoDetail {...data} asModal={false} />
      </div>
    </>
  )
}
