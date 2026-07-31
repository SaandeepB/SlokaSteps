import { describe, expect, it } from 'vitest'
import {
  normalizeBasePath,
  publicAssetUrl,
  routerBasenameFromBasePath,
} from '../../basePath'

describe('deployment base path', () => {
  it('normalizes root and nested deployment paths', () => {
    expect(normalizeBasePath()).toBe('/')
    expect(normalizeBasePath('SlokaSteps')).toBe('/SlokaSteps/')
    expect(normalizeBasePath('/family//slokas///')).toBe('/family/slokas/')
    expect(routerBasenameFromBasePath('/')).toBe('/')
    expect(routerBasenameFromBasePath('/SlokaSteps/')).toBe('/SlokaSteps')
  })

  it('prefixes canonical public assets with the configured base', () => {
    expect(
      publicAssetUrl(
        '/audio/slokas/saraswati/line-1.mp3',
        '/SlokaSteps/',
      ),
    ).toBe('/SlokaSteps/audio/slokas/saraswati/line-1.mp3')
  })

  it('rejects origins, traversal, and unsafe public references', () => {
    expect(() => normalizeBasePath('https://example.com/app')).toThrow()
    expect(() => normalizeBasePath('//example.com/app')).toThrow()
    expect(() => normalizeBasePath('/app/../private')).toThrow()
    expect(() => publicAssetUrl('audio/file.mp3', '/')).toThrow()
    expect(() => publicAssetUrl('//example.com/file.mp3', '/')).toThrow()
  })
})
