export interface Derived { large: Blob; thumb: Blob; archive: Blob | null; width: number; height: number }

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

// Detect WebP canvas-encoding support once per session (Safari < 16 silently
// returns a PNG blob when asked for WebP, causing huge uncompressed files).
let _webpSupported: boolean | null = null
function webpSupported(): Promise<boolean> {
  if (_webpSupported !== null) return Promise.resolve(_webpSupported)
  const c = document.createElement("canvas")
  c.width = 1; c.height = 1
  return new Promise((resolve) => {
    c.toBlob((b) => {
      _webpSupported = b?.type === "image/webp"
      resolve(_webpSupported!)
    }, "image/webp", 0.5)
  })
}

function scaleTo(bmp: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext("2d")!
  // Fill black so alpha is opaque — JPEG doesn't support transparency.
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bmp, 0, 0, w, h)
  return webpSupported().then((ok) =>
    new Promise((resolve) => canvas.toBlob((b) => resolve(b!), ok ? "image/webp" : "image/jpeg", quality))
  )
}

const MAX_RAW_BYTES = 15 * 1024 * 1024 // above this, generate a 2400px WebP archive instead of sending raw

export async function deriveImages(file: File): Promise<Derived> {
  const bmp = await loadBitmap(file)
  const needsArchive = file.size > MAX_RAW_BYTES
  const [large, thumb, archive] = await Promise.all([
    scaleTo(bmp, 1600, 0.82),
    scaleTo(bmp, 500, 0.72),
    needsArchive ? scaleTo(bmp, 2400, 0.92) : Promise.resolve(null),
  ])
  const { width, height } = bmp
  bmp.close()
  return { large, thumb, archive, width, height }
}
