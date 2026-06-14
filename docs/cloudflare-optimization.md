# Cloudflare request optimization — operator setup

This app is tuned to minimise Cloudflare Worker requests on the free tier. Most
of it works automatically once deployed, but a few one-time Cloudflare steps
unlock the rest. Each section says what breaks if you skip it.

## 1. Media is served from the R2 CDN (already active)

Image and video URLs point at `cdn.gallery.mataev.no` (the R2 bucket's public
custom domain) instead of the Worker's `/img/*` routes. Browsers fetch media
straight from R2, which does **not** count as a Worker request and supports
range requests for video scrubbing. The old `/img/*` routes now 301-redirect to
the CDN for backwards compatibility.

Nothing to configure — just confirm after deploy that thumbnails/videos load
from `cdn.gallery.mataev.no` in DevTools → Network.

## 2. Page caching (ISR) — requires a cache bucket

Public pages use incremental static regeneration (5-minute revalidation) backed
by an R2 bucket, so repeat renders reuse stored HTML instead of re-querying D1.

**Required once:**

```
wrangler r2 bucket create gallery-cache
```

This matches the `NEXT_INC_CACHE_R2_BUCKET` binding in `wrangler.toml`. It is a
separate bucket from `gallery-photos` so cached HTML is never exposed on the
public CDN. If the bucket doesn't exist, the deploy/Worker will fail to bind.

> Note: ISR reduces D1 and CPU work, but the Worker is still invoked for each
> page request. To make repeat page loads skip the Worker entirely, add the
> Cache Rule in section 4.

## 3. Direct-to-R2 uploads — requires S3 credentials + bucket CORS

Originals (and videos) upload straight from the browser to R2 via a presigned
URL, so they never pass through the Worker. This removes the heaviest upload
request **and** lifts the Worker's 100 MB request-body limit, which is what made
large video uploads fail.

**This is optional and degrades gracefully:** until it's configured, uploads
fall back to streaming the original through the Worker (works for files under
100 MB). The admin Uploader also falls back automatically if a direct upload
fails (e.g. CORS not yet set).

**Required to enable:**

1. Create an R2 API token (S3 credentials) with object read/write on
   `gallery-photos`: Cloudflare dashboard → R2 → Manage R2 API Tokens.
2. Set the credentials as Worker secrets:
   ```
   wrangler secret put R2_ACCOUNT_ID
   wrangler secret put R2_ACCESS_KEY_ID
   wrangler secret put R2_SECRET_ACCESS_KEY
   ```
3. Add a CORS policy to the `gallery-photos` bucket (R2 → bucket → Settings →
   CORS Policy) allowing PUT from the site:
   ```json
   [
     {
       "AllowedOrigins": ["https://gallery.mataev.no"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type", "cache-control"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

After enabling, upload a large video and confirm in DevTools → Network that the
PUT goes to `*.r2.cloudflarestorage.com`, not `/api/admin/upload/.../original`.

## 4. Cache Rule for public pages (optional, biggest remaining win)

To make repeat **page** loads skip the Worker (served from Cloudflare's edge
cache instead), add a Cache Rule. This is the only lever that reduces the Worker
*request count* for page views, not just their cost.

Cloudflare dashboard → Caching → Cache Rules → Create rule:

- **If** incoming requests match: `URI Path` `does not start with` `/api` **and**
  `URI Path` `does not start with` `/admin` **and** `Request Method` `equals` `GET`
- **Then:** Eligible for cache; Edge TTL: "Ignore cache-control header and use
  this TTL" → e.g. 300 seconds (match the ISR window); Browser TTL: respect
  origin.

Keep `/api/*` and `/admin*` excluded so dynamic and authenticated routes are
never cached. Test by loading the home page twice and checking the
`cf-cache-status` response header flips to `HIT`.
