import { findVideoGps, findVideoCreationDate, type VideoGps } from "@/lib/quicktime"

const SCAN_BYTES = 8 * 1024 * 1024

export interface VideoFileMeta { gps: VideoGps | null; takenAt: number | null }

/**
 * Read GPS + capture time from a video file by scanning its head and tail
 * slices — the moov atom can sit at either end, and 8 MB from each side
 * covers it without loading a whole clip into memory.
 */
export async function readVideoMeta(file: File): Promise<VideoFileMeta> {
  const head = new Uint8Array(await file.slice(0, SCAN_BYTES).arrayBuffer())
  let gps = findVideoGps(head)
  let takenAt = findVideoCreationDate(head)
  if ((!gps || !takenAt) && file.size > SCAN_BYTES) {
    const tail = new Uint8Array(await file.slice(file.size - SCAN_BYTES).arrayBuffer())
    gps = gps ?? findVideoGps(tail)
    takenAt = takenAt ?? findVideoCreationDate(tail)
  }
  return { gps, takenAt }
}
