import { db } from "@/lib/db"
import { listPhotos } from "@/lib/photos"
import { rowToDTO } from "@/lib/serialize"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE = "https://gallery.mataev.no"

export async function GET() {
  const database = await db()
  const items = await listPhotos(database, { limit: 50 })

  const itemsXml = items.map(({ row, tags }) => {
    const dto = rowToDTO(row, tags)
    const pubDate = row.created_at ? new Date(row.created_at * 1000).toUTCString() : new Date().toUTCString()
    const desc = [dto.caption, dto.place, dto.country].filter(Boolean).join(" · ") || "Photograph by Bilal R. Mataev"
    return `<item>
      <title><![CDATA[${dto.caption ?? dto.place ?? "Frame"}]]></title>
      <link>${BASE}/image/${dto.slug}</link>
      <guid isPermaLink="true">${BASE}/image/${dto.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${desc}]]></description>
      <enclosure url="${BASE}${dto.url.large}" type="image/webp" length="0" />
    </item>`
  }).join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Mataev Photography</title>
    <link>${BASE}</link>
    <description>Photography by Bilal R. Mataev</description>
    <language>en</language>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  })
}
