/**
 * Log-mel feature frontend for the on-device chant analyzer.
 *
 * Reproduces the eval-mode forward pass of NeMo's
 * `AudioToMelSpectrogramPreprocessor` exactly as configured in the Su-śrotā
 * checkpoint, because that preprocessor cannot be exported to ONNX
 * (`torch.stft` complex output — see research/pronunciation-ai/11). Every
 * step below was read from the installed NeMo source, not guessed:
 *
 *   1. no dither (training-only branch),
 *   2. pre-emphasis 0.97,
 *   3. STFT: n_fft 512, hop 160, win 400 (hann, periodic=False, zero-padded
 *      centred to 512), center=True with CONSTANT (zero) edge padding —
 *      NeMo overrides torch's default reflect padding,
 *   4. power spectrum (|X|^2),
 *   5. mel filterbank matmul (the 80x257 matrix is exported verbatim from
 *      the checkpoint, so no librosa reimplementation is involved),
 *   6. log(x + 2^-24),
 *   7. per-feature normalisation over the valid frames: mean, then unbiased
 *      std (N-1) with +1e-5, then zeros beyond the valid length.
 *
 * Valid length is floor(sampleCount / hop); the STFT itself produces one
 * extra frame (1 + floor(L/hop)) whose values are zeroed after
 * normalisation, matching NeMo's masking. `chantFrontend.test.ts` holds this
 * port to the checkpoint's own output on real audio.
 */

export interface MelFrontendConfig {
  nFft: number
  winLength: number
  hopLength: number
  nMels: number
  preemph: number
  logZeroGuard: number
  normalizeStdEps: number
  magPower: number
  padTo: number
}

export interface MelFrontendConstants {
  /** Hann window, `winLength` samples (periodic=False). */
  window: Float32Array
  /** Mel filterbank, row-major [nMels][nFft/2 + 1]. */
  filterbank: Float32Array
}

export interface MelFeatures {
  /** Row-major [nMels][frames], the ONNX `audio_signal` layout for batch 1. */
  data: Float32Array
  /** Total frames in `data` (1 + floor(L/hop), includes the masked tail). */
  frames: number
  /** Valid frames — the ONNX `length` input (floor(L/hop)). */
  featLen: number
}

interface Fft {
  size: number
  cosTable: Float64Array
  sinTable: Float64Array
  reverse: Uint32Array
}

function makeFft(size: number): Fft {
  const levels = Math.log2(size)
  if (!Number.isInteger(levels)) {
    throw new Error(`FFT size must be a power of two, got ${size}`)
  }
  const cosTable = new Float64Array(size / 2)
  const sinTable = new Float64Array(size / 2)
  for (let i = 0; i < size / 2; i++) {
    cosTable[i] = Math.cos((2 * Math.PI * i) / size)
    sinTable[i] = Math.sin((2 * Math.PI * i) / size)
  }
  const reverse = new Uint32Array(size)
  for (let i = 0; i < size; i++) {
    let r = 0
    for (let bit = 0; bit < levels; bit++) {
      r = (r << 1) | ((i >>> bit) & 1)
    }
    reverse[i] = r
  }
  return { size, cosTable, sinTable, reverse }
}

/** In-place iterative radix-2 FFT over interleaved re/im buffers. */
function fftForward(fft: Fft, re: Float64Array, im: Float64Array): void {
  const n = fft.size
  for (let i = 0; i < n; i++) {
    const j = fft.reverse[i]
    if (j > i) {
      let t = re[i]
      re[i] = re[j]
      re[j] = t
      t = im[i]
      im[i] = im[j]
      im[j] = t
    }
  }
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2
    const step = n / size
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const twiddle = k * step
        const cos = fft.cosTable[twiddle]
        const sin = fft.sinTable[twiddle]
        const evenIndex = start + k
        const oddIndex = start + k + half
        const oddRe = re[oddIndex] * cos + im[oddIndex] * sin
        const oddIm = im[oddIndex] * cos - re[oddIndex] * sin
        re[oddIndex] = re[evenIndex] - oddRe
        im[oddIndex] = im[evenIndex] - oddIm
        re[evenIndex] += oddRe
        im[evenIndex] += oddIm
      }
    }
  }
}

/**
 * Compute NeMo-equivalent log-mel features for one 16 kHz mono recording.
 * Internal math runs in float64 and is stored as float32, which the golden
 * test bounds against the PyTorch float32 pipeline.
 */
export function computeLogMelFeatures(
  audio: Float32Array,
  config: MelFrontendConfig,
  constants: MelFrontendConstants,
): MelFeatures {
  const { nFft, winLength, hopLength, nMels, preemph, logZeroGuard } = config
  const bins = nFft / 2 + 1
  if (constants.window.length !== winLength) {
    throw new Error(
      `window length ${constants.window.length} does not match config ${winLength}`,
    )
  }
  if (constants.filterbank.length !== nMels * bins) {
    throw new Error(
      `filterbank size ${constants.filterbank.length} does not match ${nMels}x${bins}`,
    )
  }
  const sampleCount = audio.length
  const featLen = Math.floor(sampleCount / hopLength)
  const frames = featLen + 1
  const pad = nFft / 2

  // Pre-emphasis into a zero-padded (constant pad_mode) buffer.
  const padded = new Float64Array(sampleCount + 2 * pad)
  if (sampleCount > 0) {
    padded[pad] = audio[0]
    for (let t = 1; t < sampleCount; t++) {
      padded[pad + t] = audio[t] - preemph * audio[t - 1]
    }
  }

  // Window centred in the FFT frame, exactly like torch.stft zero-pads a
  // window shorter than n_fft.
  const windowOffset = Math.floor((nFft - winLength) / 2)

  const fft = makeFft(nFft)
  const re = new Float64Array(nFft)
  const im = new Float64Array(nFft)
  const power = new Float64Array(bins)
  const logMel = new Float64Array(nMels * frames)

  for (let frame = 0; frame < frames; frame++) {
    const start = frame * hopLength
    re.fill(0)
    im.fill(0)
    for (let k = 0; k < winLength; k++) {
      re[windowOffset + k] =
        padded[start + windowOffset + k] * constants.window[k]
    }
    fftForward(fft, re, im)
    for (let b = 0; b < bins; b++) {
      power[b] = re[b] * re[b] + im[b] * im[b]
    }
    for (let m = 0; m < nMels; m++) {
      let acc = 0
      const row = m * bins
      for (let b = 0; b < bins; b++) {
        acc += constants.filterbank[row + b] * power[b]
      }
      logMel[m * frames + frame] = Math.log(acc + logZeroGuard)
    }
  }

  // Per-feature normalisation over the valid frames only.
  const out = new Float32Array(nMels * frames)
  const denom = featLen - 1
  for (let m = 0; m < nMels; m++) {
    const row = m * frames
    let mean = 0
    for (let t = 0; t < featLen; t++) mean += logMel[row + t]
    mean = featLen > 0 ? mean / featLen : 0
    let variance = 0
    for (let t = 0; t < featLen; t++) {
      const d = logMel[row + t] - mean
      variance += d * d
    }
    // NeMo: unbiased std, NaN (featLen < 2) treated as 0, then +1e-5.
    const std =
      denom > 0 ? Math.sqrt(variance / denom) + config.normalizeStdEps : config.normalizeStdEps
    for (let t = 0; t < featLen; t++) {
      out[row + t] = (logMel[row + t] - mean) / std
    }
    // Frames beyond featLen stay zero, matching NeMo's masking.
  }
  return { data: out, frames, featLen }
}
