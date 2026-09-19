import { readFileSync } from 'node:fs'

/**
 * Minimal RIFF/WAVE reader for the research clips (16 kHz mono PCM16).
 * Matches the Python harness's soundfile read: int16 / 32768 -> float32.
 * Test/validation helper only — the app itself decodes recordings through
 * the Web Audio API.
 */
export function readWav16kMono(path: string): Float32Array {
  const buffer = readFileSync(path)
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${path} is not a RIFF/WAVE file`)
  }
  let offset = 12
  let format: { channels: number; sampleRate: number; bits: number } | null = null
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)
    const body = offset + 8
    if (chunkId === 'fmt ') {
      const audioFormat = buffer.readUInt16LE(body)
      if (audioFormat !== 1) throw new Error(`${path}: only PCM supported`)
      format = {
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bits: buffer.readUInt16LE(body + 14),
      }
    } else if (chunkId === 'data') {
      if (!format) throw new Error(`${path}: data chunk before fmt`)
      if (format.sampleRate !== 16000 || format.channels !== 1 || format.bits !== 16) {
        throw new Error(
          `${path}: expected 16 kHz mono PCM16, got ${format.sampleRate} Hz ` +
            `${format.channels}ch ${format.bits}bit`,
        )
      }
      const samples = Math.floor(chunkSize / 2)
      const out = new Float32Array(samples)
      for (let i = 0; i < samples; i++) {
        out[i] = buffer.readInt16LE(body + i * 2) / 32768
      }
      return out
    }
    offset = body + chunkSize + (chunkSize % 2)
  }
  throw new Error(`${path}: no data chunk found`)
}
