import { AwsClient } from "aws4fetch"
import { cf } from "./env"

// The R2 bucket bound as PHOTOS in wrangler.toml. The S3 endpoint addresses
// the bucket by name, so it must match the bound bucket.
const BUCKET = "gallery-photos"

// Long-lived immutable caching, matching putPhotoObject() so the CDN treats
// directly-uploaded originals the same as Worker-uploaded derivatives.
export const ORIGINAL_CACHE_CONTROL = "public, max-age=31536000, immutable"

/**
 * Returns a presigned PUT URL that lets the browser upload an object straight
 * to R2, bypassing the Worker (and its request-body size and CPU limits) — the
 * key fix for large videos. Returns null when R2 S3 credentials aren't
 * configured, in which case the caller streams the original through the Worker.
 *
 * The browser must PUT with exactly the Content-Type and Cache-Control headers
 * signed here, and the bucket needs a CORS rule allowing PUT from the site.
 */
export async function presignOriginalPut(key: string, contentType: string): Promise<string | null> {
  const env = await cf()
  const accountId = env.R2_ACCOUNT_ID
  const accessKeyId = env.R2_ACCESS_KEY_ID
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) return null

  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" })
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${BUCKET}/${key}?X-Amz-Expires=3600`
  const signed = await client.sign(endpoint, {
    method: "PUT",
    headers: {
      "content-type": contentType,
      "cache-control": ORIGINAL_CACHE_CONTROL,
    },
    aws: { signQuery: true },
  })
  return signed.url
}
