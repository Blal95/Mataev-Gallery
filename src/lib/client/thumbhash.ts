import { rgbaToThumbHash } from "thumbhash"

export async function computeThumbhash(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 100 / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bmp, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  bmp.close()
  const hash = rgbaToThumbHash(w, h, data)
  let s = ""
  for (const b of hash) s += String.fromCharCode(b)
  return btoa(s)
}
