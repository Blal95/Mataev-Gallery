export async function toJpegIfHeic(file: File): Promise<File> {
  if (!/heic|heif/i.test(file.type) && !/\.heic$|\.heif$/i.test(file.name)) return file
  const heic2any = (await import("heic2any")).default
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })
  const blob = Array.isArray(result) ? result[0] : result
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
}
