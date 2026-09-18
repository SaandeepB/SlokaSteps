import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  // The chant-analysis suites run under `@vitest-environment node`, where no
  // DOM exists to clean up.
  if (typeof window !== 'undefined') {
    cleanup()
    window.localStorage.clear()
  }
})
