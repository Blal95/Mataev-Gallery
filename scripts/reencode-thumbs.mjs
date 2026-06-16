#!/usr/bin/env node
/**
 * Re-encodes all existing thumb.webp and large.webp files in R2 that were
 * accidentally stored as PNG (canvas.toBlob fallback on Safari < 16).
 * Outputs JPEG (libwebp unavailable on this build) with correct Content-Type
 * so browsers decode properly regardless of the .webp filename.
 *
 * thumb: ≤500px long edge, q:v 5 (~85% JPEG) → ~15-25KB per image
 * large: ≤1600px long edge, q:v 3 (~92% JPEG) → ~80-200KB per image
 *
 * Usage:  node scripts/reencode-thumbs.mjs [id1 id2 ...]
 *   Pass photo IDs as arguments to retry specific photos only.
 *
 * Requirements: wrangler authenticated, ffmpeg + sips (macOS) in PATH.
 */

import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync, readFileSync, unlinkSync, rmdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const CDN = "https://cdn.gallery.mataev.no"
const BUCKET = "gallery-photos"
const CACHE_CONTROL = "public, max-age=31536000, immutable"

// Optional: pass photo IDs as CLI args to process only those photos
const ONLY_IDS = process.argv.slice(2).length > 0 ? new Set(process.argv.slice(2)) : null

function wrangler(...args) {
  return execFileSync("npx", ["wrangler", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })
}

// quality here is ffmpeg -q:v (1=best…31=worst); 5≈85% JPEG, 3≈92% JPEG
// -vframes 1: stop after the first video frame so the embedded grayscale
// EXIF thumbnail (frame 2 in iPhone JPEGs) never overwrites the color output.
function ffmpegResize(inputPath, outputPath, maxEdge, qv) {
  execFileSync("ffmpeg", [
    "-y", "-i", inputPath,
    "-vframes", "1",
    "-vf", `scale=${maxEdge}:${maxEdge}:force_original_aspect_ratio=decrease:flags=lanczos`,
    "-q:v", String(qv),
    "-update", "1",
    outputPath,
  ], { stdio: "inherit" })
}

// Fallback for formats ffmpeg can't decode (e.g. DNG/RAW files or 30-bit Tiled TIFF).
// sips is macOS built-in and handles these natively via Core Image.
// quality: 0–100 JPEG quality (85 ≈ thumb, 92 ≈ large)
// -Z resizes so neither dimension exceeds maxEdge (long-edge constraint).
function sipsResize(inputPath, outputPath, maxEdge, quality) {
  execFileSync("sips", [
    "-s", "format", "jpeg",
    "-s", "formatOptions", String(quality),
    "-Z", String(maxEdge),
    inputPath,
    "--out", outputPath,
  ], { stdio: ["ignore", "pipe", "inherit"] })
}

function resize(inputPath, outputPath, maxEdge, qv, sipsQuality) {
  try {
    ffmpegResize(inputPath, outputPath, maxEdge, qv)
  } catch {
    console.log("  ⚠ ffmpeg failed → sips fallback")
    sipsResize(inputPath, outputPath, maxEdge, sipsQuality)
  }
}

async function fetchBytes(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

// Query remote D1 for all published photos
console.log("Querying D1 for all published photos…")
const raw = wrangler("d1", "execute", "DB", "--remote",
  "--command", "SELECT id, r2_original, r2_thumb, r2_large FROM photos WHERE published > 0",
  "--json")
const rows = JSON.parse(raw)[0].results
const filtered = ONLY_IDS ? rows.filter((r) => ONLY_IDS.has(r.id)) : rows
console.log(`Found ${rows.length} photos${ONLY_IDS ? `, processing ${filtered.length} selected` : ""}.`)

const dir = mkdtempSync(join(tmpdir(), "reencode-"))
let ok = 0, fail = 0

for (const row of filtered) {
  const { id, r2_original, r2_thumb, r2_large } = row
  console.log(`\n[${ok + fail + 1}/${filtered.length}] ${id}`)

  const origPath  = join(dir, `${id}_orig`)
  const thumbPath = join(dir, `${id}_thumb.jpg`)
  const largePath = join(dir, `${id}_large.jpg`)

  try {
    // 1. Download original
    console.log(`  ↓ ${CDN}/${r2_original}`)
    const origBytes = await fetchBytes(`${CDN}/${r2_original}`)
    writeFileSync(origPath, origBytes)

    // 2. Re-encode thumb (≤500px long edge, ~85% JPEG)
    console.log(`  ⚙ encode thumb`)
    resize(origPath, thumbPath, 500, 5, 85)
    const thumbKB = Math.round(readFileSync(thumbPath).length / 1024)
    console.log(`  ✓ thumb → ${thumbKB}KB`)

    // 3. Re-encode large (≤1600px long edge, ~92% JPEG)
    console.log(`  ⚙ encode large`)
    resize(origPath, largePath, 1600, 3, 92)
    const largeKB = Math.round(readFileSync(largePath).length / 1024)
    console.log(`  ✓ large → ${largeKB}KB`)

    // 4. Upload thumb (content-type image/jpeg; filename stays thumb.webp)
    console.log(`  ↑ ${r2_thumb}`)
    wrangler("r2", "object", "put", `${BUCKET}/${r2_thumb}`,
      "--remote",
      "--file", thumbPath,
      "--content-type", "image/jpeg",
      "--cache-control", CACHE_CONTROL)

    // 5. Upload large
    console.log(`  ↑ ${r2_large}`)
    wrangler("r2", "object", "put", `${BUCKET}/${r2_large}`,
      "--remote",
      "--file", largePath,
      "--content-type", "image/jpeg",
      "--cache-control", CACHE_CONTROL)

    ok++
  } catch (err) {
    console.error(`  ✗ FAILED: ${err.message}`)
    fail++
  } finally {
    for (const p of [origPath, thumbPath, largePath]) {
      try { unlinkSync(p) } catch {}
    }
  }
}

try { rmdirSync(dir) } catch {}

console.log(`\nDone. ${ok} re-encoded, ${fail} failed.`)
