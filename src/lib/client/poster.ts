export interface PosterResult {
  blob: Blob      // full-resolution WebP of first usable frame
  width: number
  height: number
  duration: number  // seconds
}

// Phones often ramp exposure over the first frames, so frame 0 (and even ~0.5s)
// can come back black. Seek a quarter of the way in, and if the captured frame
// is still near-black, advance once more before giving up.
export function extractPoster(file: File): Promise<PosterResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    const objectUrl = URL.createObjectURL(file)
    video.preload = "metadata"
    video.muted = true
    video.playsInline = true
    video.src = objectUrl

    let retried = false
    const seekTo = (t: number) => { video.currentTime = Math.max(0.1, Math.min(t, (video.duration || 1) - 0.05)) }

    video.addEventListener("loadedmetadata", () => {
      seekTo(Math.min(video.duration * 0.25, 2))
    })

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(video, 0, 0)

      // Sample a downscaled copy to gauge average brightness cheaply.
      if (!retried && isNearBlack(ctx, canvas.width, canvas.height)) {
        retried = true
        seekTo(Math.min(video.duration * 0.6, video.duration - 0.1))
        return
      }

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl)
          if (!blob) { reject(new Error("canvas blob failed")); return }
          resolve({ blob, width: video.videoWidth, height: video.videoHeight, duration: video.duration })
        },
        "image/webp",
        0.85,
      )
    })

    video.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("video load failed"))
    })
  })
}

/** Cheap luminance check on a tiny sample of the frame; true when ~uniformly dark. */
function isNearBlack(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const sw = 32, sh = Math.max(1, Math.round((h / w) * 32))
  const sample = document.createElement("canvas")
  sample.width = sw; sample.height = sh
  const sctx = sample.getContext("2d")!
  sctx.drawImage(ctx.canvas, 0, 0, sw, sh)
  const { data } = sctx.getImageData(0, 0, sw, sh)
  let sum = 0
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  }
  return sum / (data.length / 4) < 12 // 0–255 scale; below ~12 is effectively black
}
