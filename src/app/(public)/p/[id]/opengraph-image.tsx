import { ImageResponse } from "next/og"
import { db } from "@/lib/db"
import { cdnBase } from "@/lib/env"
import { getPhotoDTO } from "@/lib/detail"
import {
  formatCamera,
  formatAperture,
  formatExposure,
  formatFocal,
  flagEmoji,
} from "@/lib/format"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Gallery palette (matches globals.css tokens).
const BG = "#0a0908"
const PANEL = "#100e0c"
const AMBER = "#e3a857"
const TEXT = "#efe8dd"
const MUTED = "#9b8f80"
const LINE = "#2a241d"

/**
 * The tower-M seal, inlined as explicit paths. Satori (next/og) does not
 * support <use> or external React components, so the right tower is written
 * out rather than mirrored, and the wordmark is a sibling <div>.
 */
function Seal() {
  return (
    <svg width="64" height="58" viewBox="0 0 200 182" fill={AMBER}>
      <rect x="26" y="166" width="148" height="7" />
      <path d="M58 50 L100 150 L142 50 L123 50 L100 118 L77 50 Z" />
      {/* left tower */}
      <path d="M30 166 L42 48 L58 48 L66 166 Z" fill="none" stroke={AMBER} strokeWidth="6" />
      <path d="M37 48 L61 48 L59 42 L39 42 Z" />
      <path d="M40 41 L58 41 L56 35 L42 35 Z" />
      <path d="M43 34 L55 34 L53 28 L45 28 Z" />
      <path d="M46 27 L52 27 L49 21 Z" />
      {/* right tower (explicit mirror of the left across x=100) */}
      <path d="M170 166 L158 48 L142 48 L134 166 Z" fill="none" stroke={AMBER} strokeWidth="6" />
      <path d="M163 48 L139 48 L141 42 L161 42 Z" />
      <path d="M160 41 L142 41 L144 35 L158 35 Z" />
      <path d="M157 34 L145 34 L147 28 L155 28 Z" />
      <path d="M154 27 L148 27 L151 21 Z" />
    </svg>
  )
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let photo = null
  try {
    photo = await getPhotoDTO(await db(), await cdnBase(), id)
  } catch {}

  const caption = photo?.caption ?? null
  const place = photo ? [flagEmoji(photo.countryCode), photo.place].filter(Boolean).join(" ") : ""
  // Satori (next/og) can only decode PNG/JPEG — the large/thumb renditions are
  // WebP, so they render blank. The original is the only JPEG/PNG rendition, so
  // use it when the source format is decodable; otherwise leave the panel dark.
  const ogDecodable = photo ? /^(jpe?g|png)$/i.test(photo.format) : false
  const imgUrl = ogDecodable ? photo!.url.original : ""

  // EXIF readout — same instrument-strip order as the on-site ExposureStrip.
  const exif = photo
    ? [
        formatCamera(photo.camera, photo.lens) ? photo.camera : null,
        formatFocal(photo.focal),
        formatAperture(photo.fNumber),
        formatExposure(photo.exposure),
        photo.iso ? `ISO ${photo.iso}` : null,
      ].filter(Boolean)
    : []

  const date = photo?.takenAt
    ? new Date(photo.takenAt)
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase()
    : null

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: BG,
          fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
        }}
      >
        {/* Left: the photograph, with a thin amber rule on its inner edge */}
        <div style={{ display: "flex", width: 760, height: 630, flexShrink: 0, position: "relative" }}>
          {imgUrl ? (
            <img src={imgUrl} alt="" width={760} height={630} style={{ width: 760, height: 630, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 760, height: 630, background: PANEL }} />
          )}
          <div style={{ position: "absolute", top: 0, right: 0, width: 3, height: 630, background: AMBER }} />
        </div>

        {/* Right: the print-stamp card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "44px 40px",
            flex: 1,
          }}
        >
          {/* Top: seal + wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Seal />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 34, fontWeight: 700, color: TEXT, letterSpacing: "0.16em" }}>
                MATAEV
              </span>
              <span style={{ fontSize: 13, color: MUTED, letterSpacing: "0.28em", textTransform: "uppercase" }}>
                Photography
              </span>
            </div>
          </div>

          {/* Middle: caption */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {caption ? (
              <span style={{ fontSize: 30, color: TEXT, lineHeight: 1.3, fontStyle: "italic" }}>
                {caption}
              </span>
            ) : null}
            {place ? (
              <span style={{ fontSize: 15, color: AMBER, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                {place}
              </span>
            ) : null}
          </div>

          {/* Bottom: EXIF instrument readout + date, divided by an amber tick */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ width: 56, height: 2, background: AMBER }} />
            {exif.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                {exif.map((part, i) => (
                  <span key={i} style={{ fontSize: 16, color: TEXT, letterSpacing: "0.04em" }}>
                    {part}
                  </span>
                ))}
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
              <span style={{ fontSize: 13, color: MUTED, letterSpacing: "0.16em" }}>
                {date ?? "GALLERY.MATAEV.NO"}
              </span>
              <span style={{ fontSize: 13, color: MUTED, letterSpacing: "0.16em" }}>
                {date ? "GALLERY.MATAEV.NO" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
