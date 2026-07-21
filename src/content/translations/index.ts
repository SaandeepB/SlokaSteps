import type { SupportedLanguage } from '../../types'
import { en } from './en'
import type { TranslationKey } from './en'
import { hi } from './hi'
import { te } from './te'
import { kn } from './kn'
import { ta } from './ta'
import { mr } from './mr'

export type { TranslationKey }

export type TranslationReviewStatus = 'prototype-draft' | 'prototype-reviewed'

export interface TranslationPack {
  reviewStatus: TranslationReviewStatus
  strings: Partial<Record<TranslationKey, string>>
}

const packs: Record<SupportedLanguage, TranslationPack> = {
  en,
  hi,
  te,
  kn,
  ta,
  mr,
}

export type TranslationVars = Record<string, string | number>

function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

const warnedMissing = new Set<string>()

/**
 * Resolves a translation with a safe English fallback. Raw keys are never
 * shown to users; missing values log a single development warning each.
 */
export function translate(
  language: SupportedLanguage,
  key: TranslationKey,
  vars?: TranslationVars,
): string {
  const localized = packs[language]?.strings[key]
  if (localized !== undefined) return interpolate(localized, vars)

  if (language !== 'en' && import.meta.env.DEV) {
    const warnKey = `${language}:${key}`
    if (!warnedMissing.has(warnKey)) {
      warnedMissing.add(warnKey)
      console.warn(
        `Sloka Steps i18n: missing "${key}" for "${language}", falling back to English.`,
      )
    }
  }
  return interpolate(en.strings[key], vars)
}

export function getPackReviewStatus(
  language: SupportedLanguage,
): TranslationReviewStatus {
  return packs[language].reviewStatus
}
