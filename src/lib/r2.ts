import { cf } from "./env"

export function photoKeys(id: string, ext: string) {
  return {
    original: `photos/${id}/original.${ext}`,
    large: `photos/${id}/large.webp`,
    thumb: `photos/${id}/thumb.webp`,
  }
}

export async function putPhotoObject(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  await (await cf()).PHOTOS.put(key, body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
  })
}

export async function deletePhotoObjects(keys: string[]): Promise<void> {
  await (await cf()).PHOTOS.delete(keys)
}
