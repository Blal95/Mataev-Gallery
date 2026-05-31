import { ImageResponse } from "next/og"
import { db } from "@/lib/db"
import { cdnBase } from "@/lib/env"
import { getDetail } from "@/lib/detail"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getDetail(db(), cdnBase(), id)

  const caption = data?.photo.caption ?? "MATAEV"
  const place = data?.photo.place ?? ""
  const imgUrl = data?.photo.url.large ?? ""

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#0b0d10",
          fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
        }}
      >
        {/* Left: photo */}
        {imgUrl ? (
          <img
            src={imgUrl}
            alt=""
            style={{ width: 800, height: 630, objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 800, height: 630, background: "#0c0f16", flexShrink: 0 }} />
        )}

        {/* Right: wordmark + meta */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "40px 36px",
            gap: 16,
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: "#5bc0eb",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            MATAEV
          </span>
          {caption ? (
            <span
              style={{
                fontSize: 18,
                color: "#e8edf5",
                lineHeight: 1.4,
                maxWidth: 300,
              }}
            >
              {caption}
            </span>
          ) : null}
          {place ? (
            <span
              style={{
                fontSize: 12,
                color: "#5a6478",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
              }}
            >
              {place}
            </span>
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  )
}
