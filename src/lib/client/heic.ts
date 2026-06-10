const KNOWN_IMG = /^image\/(jpeg|png|webp|gif|bmp|avif)$/i

export async function toJpegIfHeic(file: File): Promise<File> {
  // If the browser reports a known renderable type, trust it (iOS sends JPEG
  // content with .HEIC extension when "Automatic" transfer is on — running
  // heic2any on a JPEG produces garbage).
  if (KNOWN_IMG.test(file.type)) return file
  if (!/heic|heif/i.test(file.type) && !/\.heic$|\.heif$/i.test(file.name)) return file
  const heic2any = (await import("heic2any")).default
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })
  const blob = Array.isArray(result) ? result[0] : result
  if (blob.size < 1024) throw new Error("HEIC conversion produced empty output — try a different photo")
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
}
