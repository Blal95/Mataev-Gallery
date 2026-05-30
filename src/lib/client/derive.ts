export interface Derived { large: Blob; thumb: Blob; width: number; height: number }

async function loadBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file)
}

function scaleTo(bmp: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w; canvas.height = h
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/webp", quality))
}

export async function deriveImages(file: File): Promise<Derived> {
  const bmp = await loadBitmap(file)
  const [large, thumb] = await Promise.all([scaleTo(bmp, 1600, 0.82), scaleTo(bmp, 500, 0.72)])
  return { large, thumb, width: bmp.width, height: bmp.height }
}
