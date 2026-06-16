#!/usr/bin/env node
/**
 * Purges all photo thumb + large CDN cache entries via Cloudflare API.
 *
 * Usage:
 *   CF_ZONE_ID=<zone_id> CF_PURGE_TOKEN=<token> node scripts/purge-cdn.mjs
 *
 * Zone ID:   Cloudflare dashboard → mataev.no → Overview → right sidebar → Zone ID
 * API Token: Cloudflare dashboard → My Profile → API Tokens → Create Token
 *            (Custom token: Zone → Cache Purge → Purge, zone: mataev.no)
 *
 * Note: uses CF_PURGE_TOKEN (not CLOUDFLARE_API_TOKEN) so wrangler doesn't
 * pick it up for the D1 query (the purge token lacks D1 permission).
 */

import { execFileSync } from "node:child_process"

const ZONE_ID = process.env.CF_ZONE_ID
const TOKEN   = process.env.CF_PURGE_TOKEN

if (!ZONE_ID || !TOKEN) {
  console.error("Set CF_ZONE_ID and CF_PURGE_TOKEN env vars.")
  process.exit(1)
}

const CDN = "https://cdn.gallery.mataev.no"

// Query D1 for all photo URLs
const raw = execFileSync("npx", ["wrangler", "d1", "execute", "DB", "--remote",
  "--command", "SELECT r2_thumb, r2_large FROM photos WHERE published > 0",
  "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })
const rows = JSON.parse(raw)[0].results
const urls = rows.flatMap((r) => [`${CDN}/${r.r2_thumb}`, `${CDN}/${r.r2_large}`])
console.log(`Purging ${urls.length} URLs in batches of 30…`)

// Cloudflare allows max 30 URLs per purge request
const BATCH = 30
let purged = 0

for (let i = 0; i < urls.length; i += BATCH) {
  const batch = urls.slice(i, i + BATCH)
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: batch }),
    }
  )
  const json = await res.json()
  if (!json.success) {
    console.error(`  ✗ batch ${i / BATCH + 1} failed:`, JSON.stringify(json.errors))
  } else {
    purged += batch.length
    console.log(`  ✓ batch ${i / BATCH + 1}/${Math.ceil(urls.length / BATCH)} — ${purged}/${urls.length} purged`)
  }
}

console.log(`\nDone. ${purged}/${urls.length} URLs purged.`)
