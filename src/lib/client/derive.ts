export interface Derived { large: Blob; thumb: Blob; width: number; height: number }

async function loadBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    // Fallback for formats the browser displays natively in <img> but
    // createImageBitmap() can't decode directly (e.g. HEIC on Safari desktop).
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error("Unsupported image format — try exporting as JPEG"))
        img.src = url
      })
      return await createImageBitmap(img)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
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
  const { width, height } = bmp
  bmp.close()
  return { large, thumb, width, height }
}
