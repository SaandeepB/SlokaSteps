/**
 * CTC greedy decode over the Sanskrit slice of the Su-śrotā aggregate vocab.
 *
 * Port of `greedy_decode_sanskrit_slice` in
 * `research/pronunciation-ai/scripts/load_susrota_ctc.py`: slice the 5633-way
 * log-probs to [blank] + the 256 Sanskrit tokens, optionally penalise the
 * blank column (the cheap decode-variant knob used for decode-consensus),
 * argmax per frame, CTC-collapse repeats and blanks, and map through the
 * 'sa' SentencePiece pieces. The Python original re-log-softmaxes the slice
 * before argmax; argmax is invariant under that monotone per-frame transform,
 * so it is omitted here. `chantModelParity.test.ts` holds the whole chain to
 * string-identical decodes with the Python pipeline.
 */

export interface SanskritTokenizer {
  sanskritOffset: number
  sanskritWidth: number
  blankId: number
  /** Sliced-vocab id i (1-based) maps to pieces[i - 1]; id 0 is blank. */
  pieces: string[]
}

export interface DecodedToken {
  /** SentencePiece piece text, '▁' still in place. */
  piece: string
  /** Encoder output frame where this token was emitted. */
  frame: number
}

export interface SliceDecodeResult {
  /** Human-readable decode: pieces joined, '▁' → space, trimmed. */
  text: string
  /** Emitted tokens in order, with their emission frames. */
  tokens: DecodedToken[]
}

export const DECODE_BLANK_PENALTIES = [0.0, 2.0, 4.0, 6.0] as const

const WORD_BOUNDARY = '▁' // SentencePiece '▁'

/**
 * @param logProbs row-major [frames][vocabSize] as produced by the ONNX
 *   `logprobs` output for batch 1.
 */
export function decodeSanskritSlice(
  logProbs: Float32Array,
  frames: number,
  vocabSize: number,
  tokenizer: SanskritTokenizer,
  blankPenalty = 0,
): SliceDecodeResult {
  const { sanskritOffset, sanskritWidth, blankId, pieces } = tokenizer
  if (pieces.length !== sanskritWidth) {
    throw new Error(
      `tokenizer pieces ${pieces.length} != sanskritWidth ${sanskritWidth}`,
    )
  }
  const tokens: DecodedToken[] = []
  let prev = -1
  for (let t = 0; t < frames; t++) {
    const row = t * vocabSize
    let best = 0 // sliced id 0 = blank
    let bestValue = logProbs[row + blankId] - blankPenalty
    for (let k = 0; k < sanskritWidth; k++) {
      const value = logProbs[row + sanskritOffset + k]
      if (value > bestValue) {
        bestValue = value
        best = k + 1
      }
    }
    if (best !== prev && best !== 0) {
      tokens.push({ piece: pieces[best - 1], frame: t })
    }
    prev = best
  }
  const text = tokens
    .map((token) => token.piece)
    .join('')
    .replaceAll(WORD_BOUNDARY, ' ')
    .trim()
  return { text, tokens }
}

/** One forward pass, N cheap re-argmax decode variants. */
export function decodeVariants(
  logProbs: Float32Array,
  frames: number,
  vocabSize: number,
  tokenizer: SanskritTokenizer,
  blankPenalties: readonly number[] = DECODE_BLANK_PENALTIES,
): SliceDecodeResult[] {
  return blankPenalties.map((penalty) =>
    decodeSanskritSlice(logProbs, frames, vocabSize, tokenizer, penalty),
  )
}
