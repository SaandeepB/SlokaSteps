/** Fisher–Yates shuffle; returns a new array. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Shuffle that avoids returning the original order (used so an
 * arrange-words exercise never starts pre-solved).
 */
export function shuffleAvoidingOriginal<T>(items: readonly T[]): T[] {
  if (items.length < 2) return [...items]
  for (let attempt = 0; attempt < 10; attempt++) {
    const shuffled = shuffle(items)
    if (shuffled.some((item, i) => item !== items[i])) return shuffled
  }
  // Deterministic fallback: rotate by one.
  return [...items.slice(1), items[0]]
}
