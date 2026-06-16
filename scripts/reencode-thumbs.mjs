#!/usr/bin/env node
/**
 * Re-encodes all thumb.webp and large.webp files in R2 as true WebP
 * (previously stored as JPEG with a .webp extension).
 * Uses sips (macOS 12+) for WebP output with lanczos-quality downscaling.
 *
 * thumb: ≤500px long edge, quality 82  → ~8-20KB per image
 * large: ≤1600px long edge, quality 88 → ~50-130KB per image
 *
 * Usage:  node scripts/reencode-thumbs.mjs [id1 id2 ...]
 *   Pass photo IDs as arguments to retry specific photos only.
 *
 * Requirements: wrangler authenticated, sips (macOS built-in) in PATH.
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

// sips WebP: quality 0–100, -Z = long-edge constraint (macOS 12+).
// Handles JPEG, HEIC, TIFF, DNG/RAW natively via Core Image.
function resize(inputPath, outputPath, maxEdge, quality) {
  execFileSync("sips", [
    "-s", "format", "webp",
    "-s", "formatOptions", String(quality),
    "-Z", String(maxEdge),
    inputPath,
    "--out", outputPath,
  ], { stdio: ["ignore", "pipe", "inherit"] })
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
  const thumbPath = join(dir, `${id}_thumb.webp`)
  const largePath = join(dir, `${id}_large.webp`)

  try {
    // 1. Download original
    console.log(`  ↓ ${CDN}/${r2_original}`)
    const origBytes = await fetchBytes(`${CDN}/${r2_original}`)
    writeFileSync(origPath, origBytes)

    // 2. Re-encode thumb (≤800px long edge, quality 82) — 800px covers 2× Retina at 4-col desktop
    console.log(`  ⚙ encode thumb`)
    resize(origPath, thumbPath, 800, 82)
    const thumbKB = Math.round(readFileSync(thumbPath).length / 1024)
    console.log(`  ✓ thumb → ${thumbKB}KB`)

    // 3. Re-encode large (≤1600px long edge, quality 88)
    console.log(`  ⚙ encode large`)
    resize(origPath, largePath, 1600, 88)
    const largeKB = Math.round(readFileSync(largePath).length / 1024)
    console.log(`  ✓ large → ${largeKB}KB`)

    // 4. Upload thumb
    console.log(`  ↑ ${r2_thumb}`)
    wrangler("r2", "object", "put", `${BUCKET}/${r2_thumb}`,
      "--remote",
      "--file", thumbPath,
      "--content-type", "image/webp",
      "--cache-control", CACHE_CONTROL)

    // 5. Upload large
    console.log(`  ↑ ${r2_large}`)
    wrangler("r2", "object", "put", `${BUCKET}/${r2_large}`,
      "--remote",
      "--file", largePath,
      "--content-type", "image/webp",
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
