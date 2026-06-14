import type { MetadataRoute } from "next"

const BASE = "https://gallery.mataev.no"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Dynamic imports so a missing Cloudflare binding at build time
    // doesn't break the module graph — caught by the outer try/catch.
    const { db } = await import("@/lib/db")
    const { listPhotos, listTagCounts } = await import("@/lib/photos")

    const dbInst = await db()

    const [photosWithTags, tagCounts] = await Promise.all([
      listPhotos(dbInst, {}),
      listTagCounts(dbInst),
    ])

    const photoUrls: MetadataRoute.Sitemap = photosWithTags.map(({ row }) => {
      return {
        url: `${BASE}/image/${row.slug}`,
        lastModified: (() => {
          if (!row.created_at) return undefined
          const d = new Date(row.created_at)
          if (isNaN(d.getTime())) return undefined
          return d.toISOString().split("T")[0]
        })(),
        changeFrequency: "monthly",
        priority: 0.7,
      }
    })

    const tagUrls: MetadataRoute.Sitemap = tagCounts.map(({ name }) => ({
      url: `${BASE}/t/${name}`,
      changeFrequency: "weekly",
      priority: 0.5,
    }))

    return [
      { url: BASE, changeFrequency: "daily", priority: 1.0 },
      ...photoUrls,
      ...tagUrls,
    ]
  } catch {
    // Build-time DB unavailable — return just the home URL so the build succeeds.
    return [{ url: BASE, changeFrequency: "daily", priority: 1.0 }]
  }
}
