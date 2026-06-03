export interface PosterResult {
  blob: Blob      // full-resolution WebP of first usable frame
  width: number
  height: number
  duration: number  // seconds
}

export function extractPoster(file: File): Promise<PosterResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    const objectUrl = URL.createObjectURL(file)
    video.preload = "metadata"
    video.muted = true
    video.src = objectUrl

    video.addEventListener("loadedmetadata", () => {
      // Seek a bit in so we get a real frame; clamp for very short clips
      video.currentTime = Math.min(0.5, video.duration * 0.1)
    })

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext("2d")!.drawImage(video, 0, 0)
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
