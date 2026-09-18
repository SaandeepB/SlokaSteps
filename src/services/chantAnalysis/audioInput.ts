/**
 * Recording input for the on-device chant analyzer: decode a session-only
 * recording Blob to 16 kHz mono PCM, and measure voiced milliseconds with a
 * simple energy VAD.
 *
 * The VAD is deliberately crude — a noise-floor-relative RMS threshold. It
 * exists to separate "no speech at all" from "spoke something", feeding the
 * coverage gate's `voicedMs`; it is not a speech detector a score could rest
 * on, and nothing downstream treats it as one.
 */

export const ANALYSIS_SAMPLE_RATE = 16_000

export interface DecodedRecording {
  samples: Float32Array
  durationMs: number
}

/**
 * Decode a MediaRecorder blob via the Web Audio API and resample to 16 kHz
 * mono. Browser-only (jsdom/node callers inject a substitute).
 */
export async function decodeRecordingBlob(
  blob: Blob,
): Promise<DecodedRecording> {
  const arrayBuffer = await blob.arrayBuffer()
  if (arrayBuffer.byteLength === 0) {
    return { samples: new Float32Array(0), durationMs: 0 }
  }
  const AudioContextCtor =
    globalThis.AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AudioContextCtor) {
    throw new Error('Web Audio API is unavailable')
  }
  const probeContext = new AudioContextCtor()
  let decoded: AudioBuffer
  try {
    decoded = await probeContext.decodeAudioData(arrayBuffer)
  } finally {
    void probeContext.close()
  }

  // Mixdown, then resample through an OfflineAudioContext.
  const durationMs = (decoded.length / decoded.sampleRate) * 1000
  const targetLength = Math.ceil(
    (decoded.length * ANALYSIS_SAMPLE_RATE) / decoded.sampleRate,
  )
  if (targetLength === 0) {
    return { samples: new Float32Array(0), durationMs: 0 }
  }
  const offline = new OfflineAudioContext(
    1,
    targetLength,
    ANALYSIS_SAMPLE_RATE,
  )
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start(0)
  const rendered = await offline.startRendering()
  return { samples: rendered.getChannelData(0).slice(), durationMs }
}

export interface VadResult {
  voicedMs: number
  totalMs: number
}

const VAD_FRAME_MS = 10
const VAD_WINDOW_MS = 25
/** Absolute RMS floor below which a frame can never count as voiced. */
const VAD_ABSOLUTE_FLOOR = 1e-3
/** A frame is voiced when its RMS exceeds the noise floor by this factor. */
const VAD_FLOOR_FACTOR = 3
/**
 * RMS at which a frame counts as voiced regardless of the estimated noise
 * floor. Without this, uninterrupted chanting (no pauses, so the "floor"
 * IS the voice) would be classified as silence — caught by the service
 * edge-case tests with a continuous tone.
 */
const VAD_STRONG_RMS = 0.02

/** Energy VAD over 16 kHz mono samples. */
export function measureVoicedMs(samples: Float32Array): VadResult {
  const frameStep = (ANALYSIS_SAMPLE_RATE * VAD_FRAME_MS) / 1000
  const window = (ANALYSIS_SAMPLE_RATE * VAD_WINDOW_MS) / 1000
  const totalMs = (samples.length / ANALYSIS_SAMPLE_RATE) * 1000
  if (samples.length < window) {
    return { voicedMs: 0, totalMs }
  }
  const rms: number[] = []
  for (let start = 0; start + window <= samples.length; start += frameStep) {
    let energy = 0
    for (let i = 0; i < window; i++) {
      const s = samples[start + i]
      energy += s * s
    }
    rms.push(Math.sqrt(energy / window))
  }
  const sorted = [...rms].sort((a, b) => a - b)
  const noiseFloor = sorted[Math.floor(sorted.length * 0.05)]
  const relativeThreshold = Math.max(
    VAD_ABSOLUTE_FLOOR,
    noiseFloor * VAD_FLOOR_FACTOR,
  )
  const voicedFrames = rms.filter(
    (value) => value > relativeThreshold || value >= VAD_STRONG_RMS,
  ).length
  return { voicedMs: voicedFrames * VAD_FRAME_MS, totalMs }
}
