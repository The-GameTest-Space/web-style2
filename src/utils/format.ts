import type { EventType, GameStatus } from '@/api/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
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
  return WEEKDAYS[new Date(iso).getDay()]
}

export function time(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function fullDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日（${weekday(iso)}）`
}

export function monthLabel(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
}

export function isMultiDay(start: string, end?: string) {
  return !!end && startOfDay(new Date(start)).getTime() !== startOfDay(new Date(end)).getTime()
}

/** A page's tab title, as the Worker writes it into the HTML (worker/src/meta.ts). */
export const pageTitle = (page: string) => `${page} | Game Test Space`

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  jam: 'Game Jam',
  meetup: '聚會',
  expo: '展覽',
  talk: '講座',
  playtest: '試玩會',
}

export const GAME_STATUS_LABEL: Record<GameStatus, string> = {
  seeking: '徵求測試中',
  released: '已上架',
}

/** A stable small tilt per item so the wall never looks machine-aligned. */
export function tiltFor(key: string, range = 2.4) {
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0
  const unit = ((Math.abs(h) % 1000) / 1000) * 2 - 1
  return Number((unit * range).toFixed(2))
}
