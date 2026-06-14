import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"

// Persist rendered pages (ISR) in an R2 bucket so revalidated routes survive
// across Worker invocations, and let the adapter serve cached responses before
// running the full Next handler. `queue: "direct"` revalidates inline (no
// Durable Objects needed); the app doesn't use revalidateTag, so the tag cache
// is left at its default.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: "direct",
  enableCacheInterception: true,
})
