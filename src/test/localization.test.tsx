import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { translate } from '../content/translations'
import { en } from '../content/translations/en'
import { LANGUAGES, SUPPORTED_LANGUAGES } from '../types'
import { LanguageSelector } from '../components/common/LanguageSelector'
import { SlokaTextBlock } from '../components/common/SlokaTextBlock'
import { renderWithProviders, makeState } from './testUtils'
import { createDefaultAppState } from '../context/reducer'

describe('localization engine', () => {
  it('supports exactly the six required BCP-47 languages', () => {
    expect(SUPPORTED_LANGUAGES).toEqual([
      'en-IN',
      'hi-IN',
      'te-IN',
      'kn-IN',
      'ta-IN',
      'mr-IN',
    ])
    expect(LANGUAGES.map((language) => language.code)).toEqual(SUPPORTED_LANGUAGES)
  })

  it('returns localized values when they exist', () => {
    expect(translate('hi-IN', 'startLearning')).toBe('सीखना शुरू करें')
    expect(translate('ta-IN', 'listen')).toBe('கேளுங்கள்')
  })

  it('falls back to English and never exposes a raw key', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      const value = translate(language, 'privacyLocal')
      expect(value).toBe(en.strings.privacyLocal)
      expect(value).not.toBe('privacyLocal')
    }
  })

  it('interpolates variables', () => {
    expect(translate('en-IN', 'stepOf', { current: 2, total: 10 })).toBe(
      'Step 2 of 10',
    )
  })

  it('renders all six language endonyms', () => {
    renderWithProviders(<LanguageSelector />)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'English',
      'हिन्दी',
      'తెలుగు',
      'ಕನ್ನಡ',
      'தமிழ்',
      'मराठी',
    ])
  })
})

describe('independent sloka script preference', () => {
  const line = {
    id: 'l1',
    devanagari: 'सरस्वति नमस्तुभ्यं',
    transliteration: 'Saraswati Namastubhyam',
  }

  it('shows Devanagari and transliteration under the default combined preference', () => {
    renderWithProviders(<SlokaTextBlock lines={[line]} />)
    expect(screen.getByText(line.devanagari)).toHaveAttribute('lang', 'sa-Deva')
    expect(screen.getByText(line.transliteration)).toHaveAttribute('lang', 'sa-Latn')
  })

  it('shows a reviewed-script fallback for a missing regional rendering', () => {
    const defaults = createDefaultAppState()
    renderWithProviders(<SlokaTextBlock lines={[line]} />, {
      state: makeState({
        preferences: {
          ...defaults.preferences,
          displayLanguage: 'te-IN',
          narrationLanguage: 'te-IN',
          scriptPreference: 'regional',
        },
      }),
    })
    expect(screen.getByText(en.strings.regionalScriptFallback)).toBeInTheDocument()
  })

  it('renders only Roman text when that preference is selected', () => {
    const defaults = createDefaultAppState()
    renderWithProviders(<SlokaTextBlock lines={[line]} />, {
      state: makeState({
        preferences: {
          ...defaults.preferences,
          scriptPreference: 'roman-transliteration',
        },
      }),
    })
    expect(screen.queryByText(line.devanagari)).not.toBeInTheDocument()
    expect(screen.getByText(line.transliteration)).toBeInTheDocument()
  })
})
