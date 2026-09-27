import type { EventType, GameStatus } from '@/api/types'
import { locale, t } from '@/i18n'

const DAY_MS = 86_400_000

function startOfDay(d: Date) {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

/** Whole calendar days from today until the given date (negative once past). */
export function daysUntil(iso: string, now = new Date()) {
  return Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / DAY_MS)
}

export function monthDay(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function weekday(iso: string) {
  return t('date.weekdays').split(' ')[new Date(iso).getDay()] ?? ''
}

export function time(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** The pieces the date messages (date.full, date.month) are made of. */
function dateParams(iso: string) {
  const d = new Date(iso)
  return {
    y: d.getFullYear(),
    m: d.getMonth() + 1,
    month: d.toLocaleDateString(locale, { month: 'long' }),
    d: d.getDate(),
    wd: weekday(iso),
  }
}

export const fullDate = (iso: string) => t('date.full', dateParams(iso))

export const monthLabel = (iso: string) => t('date.month', dateParams(iso))

export function isMultiDay(start: string, end?: string) {
  return !!end && startOfDay(new Date(start)).getTime() !== startOfDay(new Date(end)).getTime()
}

// Tab titles, as the Worker writes them into the HTML (worker/src/meta.ts).
export const pageTitle = (page: string) => `${page} | Game Test Space`
export const homeTitle = () => `Game Test Space | ${t('site.tagline')}`

export const EVENT_TYPES: EventType[] = ['jam', 'meetup', 'expo', 'talk', 'playtest']
export const eventTypeLabel = (type: EventType) => t(`eventType.${type}`)
export const gameStatusLabel = (status: GameStatus) => t(`gameStatus.${status}`)

/** A stable small tilt per item so the wall never looks machine-aligned. */
export function tiltFor(key: string, range = 2.4) {
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0
  const unit = ((Math.abs(h) % 1000) / 1000) * 2 - 1
  return Number((unit * range).toFixed(2))
}
