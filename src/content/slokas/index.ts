import type { LessonActivity, Sloka } from '../../types'
import { saraswatiNamastubhyam } from './saraswatiNamastubhyam'
import { vakratundaMahakaya } from './vakratundaMahakaya'
import { guruBrahma } from './guruBrahma'
import { tvamevaMata } from './tvamevaMata'
import { karagreVasate } from './karagreVasate'
import { shubhamKaroti } from './shubhamKaroti'
import { lokahSamastah } from './lokahSamastah'
import { asatoMa } from './asatoMa'
import { sarveBhavantu } from './sarveBhavantu'

/** Beginner Path — Level 1, ordered. */
export const SLOKAS: Sloka[] = [
  saraswatiNamastubhyam,
  vakratundaMahakaya,
  guruBrahma,
  tvamevaMata,
  karagreVasate,
  shubhamKaroti,
  lokahSamastah,
  asatoMa,
  sarveBhavantu,
]

export function getSlokaById(slokaId: string | undefined): Sloka | undefined {
  if (!slokaId) return undefined
  return SLOKAS.find((sloka) => sloka.id === slokaId)
}

export function getActivityById(
  sloka: Sloka,
  activityId: string | undefined,
): { activity: LessonActivity; index: number } | undefined {
  if (!activityId) return undefined
  const index = sloka.activities.findIndex((a) => a.id === activityId)
  if (index === -1) return undefined
  return { activity: sloka.activities[index], index }
}

export function getNextSloka(current: Sloka): Sloka | undefined {
  return SLOKAS.find((sloka) => sloka.order === current.order + 1)
}
