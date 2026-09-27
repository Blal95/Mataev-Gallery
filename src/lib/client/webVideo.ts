import {
  ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, Quality,
} from "mediabunny"

const SHORT_SIDE = 1080

/**
 * Transcode a phone video to a 1080p H.264/AAC MP4 for web playback. iPhone
 * originals are 4K at ~25 Mbit/s, too much to stream on ordinary connections.
 * Runs in the browser via WebCodecs; throws if the browser can't encode, in
 * which case the caller keeps playing the original.
 */
export async function transcodeWebVideo(file: File): Promise<Blob> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS })
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() })

  const conversion = await Conversion.init({
    input, output, showWarnings: false,
    video: (track) => {
      const w = track.displayWidth, h = track.displayHeight
      const scale = Math.min(1, SHORT_SIDE / Math.min(w, h))
      // Even dimensions — H.264 encoders reject odd sizes.
      const size = w <= h
        ? { width: Math.round((w * scale) / 2) * 2 }
        : { height: Math.round((h * scale) / 2) * 2 }
      return { ...size, codec: "avc", quality: new Quality({ bitrate: 5_000_000 }), forceTranscode: true }
    },
    // iPhones add a spatial-audio (APAC) track after the AAC one; keep only the first.
    audio: (track) => track.number === 1 ? { codec: "aac", quality: new Quality({ bitrate: 128_000 }) } : { discard: true },
  })
  if (!conversion.isValid) throw new Error("video can't be transcoded in this browser")
  await conversion.execute()

  const buf = (output.target as BufferTarget).buffer
  if (!buf) throw new Error("transcode produced no output")
  return new Blob([buf], { type: "video/mp4" })
}
