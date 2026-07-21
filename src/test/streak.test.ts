import { describe, expect, it } from 'vitest'
import { updateStreak } from '../utils/streak'
import { addDaysToIsoDate, toIsoDate } from '../utils/dates'

describe('streak rules', () => {
  it('first completion starts a one-day streak', () => {
    expect(
      updateStreak({ current: 0, lastQualifyingDate: null }, '2026-07-14'),
    ).toEqual({ current: 1, lastQualifyingDate: '2026-07-14' })
  })

  it('same-day completion does not increment', () => {
    expect(
      updateStreak({ current: 3, lastQualifyingDate: '2026-07-14' }, '2026-07-14'),
    ).toEqual({ current: 3, lastQualifyingDate: '2026-07-14' })
  })

  it('next-day completion increments by one', () => {
    expect(
      updateStreak({ current: 3, lastQualifyingDate: '2026-07-14' }, '2026-07-15'),
    ).toEqual({ current: 4, lastQualifyingDate: '2026-07-15' })
  })

  it('missed days reset the streak to one', () => {
    expect(
      updateStreak({ current: 7, lastQualifyingDate: '2026-07-10' }, '2026-07-14'),
    ).toEqual({ current: 1, lastQualifyingDate: '2026-07-14' })
  })

  it('handles month boundaries with local calendar math', () => {
    expect(addDaysToIsoDate('2026-08-01', -1)).toBe('2026-07-31')
    expect(
      updateStreak({ current: 2, lastQualifyingDate: '2026-07-31' }, '2026-08-01'),
    ).toEqual({ current: 3, lastQualifyingDate: '2026-08-01' })
  })

  it('formats local dates without UTC shifts', () => {
    expect(toIsoDate(new Date(2026, 6, 14))).toBe('2026-07-14')
  })
})
