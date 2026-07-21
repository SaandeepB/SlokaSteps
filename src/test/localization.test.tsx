import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { translate } from '../content/translations'
import { en } from '../content/translations/en'
import { LANGUAGES, SUPPORTED_LANGUAGES } from '../types'
import { LanguageSelector } from '../components/common/LanguageSelector'
import { SlokaTextBlock } from '../components/common/SlokaTextBlock'
import { renderWithProviders, makeState } from './testUtils'

describe('localization engine', () => {
  it('supports exactly the six required languages', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'hi', 'te', 'kn', 'ta', 'mr'])
    expect(LANGUAGES.map((l) => l.code)).toEqual(SUPPORTED_LANGUAGES)
  })

  it('returns localized values when they exist', () => {
    expect(translate('hi', 'startLearning')).toBe('सीखना शुरू करें')
    expect(translate('ta', 'listen')).toBe('கேளுங்கள்')
  })

  it('falls back to English for missing values and never shows raw keys', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      // privacyLocal is only translated in English.
      const value = translate(language, 'privacyLocal')
      expect(value).toBe(en.strings.privacyLocal)
      expect(value).not.toBe('privacyLocal')
    }
  })

  it('interpolates variables', () => {
    expect(translate('en', 'stepOf', { current: 2, total: 10 })).toBe(
      'Step 2 of 10',
    )
  })

  it('renders all six languages in the selector', () => {
    renderWithProviders(<LanguageSelector />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(6)
    expect(options.map((o) => o.textContent)).toEqual([
      'English',
      'हिन्दी',
      'తెలుగు',
      'ಕನ್ನಡ',
      'தமிழ்',
      'मराठी',
    ])
  })
})

describe('script rendering containers', () => {
  const line = {
    id: 'l1',
    devanagari: 'सरस्वति नमस्तुभ्यं',
    transliteration: 'Saraswati Namastubhyam',
  }

  it('marks Sanskrit text with lang="sa"', () => {
    renderWithProviders(<SlokaTextBlock lines={[line]} />)
    const devanagari = screen.getByText('सरस्वति नमस्तुभ्यं')
    expect(devanagari).toHaveAttribute('lang', 'sa')
  })

  it('shows the regional-script fallback notice for script languages', () => {
    renderWithProviders(<SlokaTextBlock lines={[line]} />, {
      state: makeState({
        settings: { language: 'te', dailyGoalMinutes: 10, reducedMotion: false },
      }),
    })
    expect(
      screen.getByText(en.strings.regionalScriptFallback),
    ).toBeInTheDocument()
  })

  it('does not show the fallback notice for Devanagari-based languages', () => {
    renderWithProviders(<SlokaTextBlock lines={[line]} />, {
      state: makeState({
        settings: { language: 'hi', dailyGoalMinutes: 10, reducedMotion: false },
      }),
    })
    expect(
      screen.queryByText(en.strings.regionalScriptFallback),
    ).not.toBeInTheDocument()
  })
})
