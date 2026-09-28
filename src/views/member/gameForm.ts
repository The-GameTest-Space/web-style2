import type { BuildNote, GameInput, GameStatus, OwnGame } from '@/api/types'
import type { ApiError } from '@/api/signed'
import { t, type MessageKey } from '@/i18n'

// The game upload form (GameEditView): what its inputs hold, to and from
// what the Worker takes (worker/src/games.ts), and its error messages.

// Must match PLATFORMS in worker/src/games.ts.
export const PLATFORMS = ['PC', 'Mac', 'Linux', 'Web', 'iOS', 'Android', 'Switch', 'PlayStation', 'Xbox', 'VR']
export const STATUSES: GameStatus[] = ['seeking', 'released']

/** What the inputs hold: lists as plain text, a paragraph per blank line and a question per line. */
export interface GameForm {
  slug: string
  title: string
  titleEn: string
  studio: string
  team: string
  status: GameStatus
  genres: string
  platforms: string[]
  cover: string
  pitch: string
  description: string
  feedbackWanted: string
  thread: string
  /** The Steam store page's URL. */
  steam: string
  /** The itch.io game page's URL. */
  itch: string
  buildLog: BuildNote[]
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Today in the reader's own time zone, YYYY-MM-DD. */
export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const blankNote = (): BuildNote => ({ version: '', date: today(), note: '' })

export const blankGame = (): GameForm => ({
  slug: '',
  title: '',
  titleEn: '',
  studio: '',
  team: '',
  status: 'seeking',
  genres: '',
  platforms: [],
  cover: '',
  pitch: '',
  description: '',
  feedbackWanted: '',
  thread: '',
  steam: '',
  itch: '',
  buildLog: [blankNote()],
})

export function fromGame(g: OwnGame): GameForm {
  return {
    slug: g.slug,
    title: g.title,
    titleEn: g.titleEn ?? '',
    studio: g.studio,
    team: g.team ?? '',
    status: g.status,
    genres: g.genres.join(t('common.listSep')),
    platforms: [...g.platforms],
    cover: g.cover,
    pitch: g.pitch,
    description: g.description.join('\n\n'),
    feedbackWanted: g.feedbackWanted.join('\n'),
    thread: g.thread ?? '',
    steam: g.steamAppId ? `https://store.steampowered.com/app/${g.steamAppId}/` : '',
    itch: g.itchUrl ?? '',
    buildLog: g.buildLog.map((n) => ({ ...n })),
  }
}

const lines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

export function toInput(f: GameForm): GameInput {
  return {
    slug: f.slug.trim(),
    title: f.title,
    titleEn: f.titleEn.trim() || undefined,
    studio: f.studio,
    team: f.team.trim() || undefined,
    status: f.status,
    // Commas in any of the site's languages, or the enumeration comma.
    genres: [...new Set(f.genres.split(/[,，、\n]/).map((g) => g.trim()).filter(Boolean))],
    platforms: PLATFORMS.filter((p) => f.platforms.includes(p)),
    cover: f.cover.trim(),
    pitch: f.pitch,
    description: f.description
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
    feedbackWanted: lines(f.feedbackWanted),
    thread: f.thread.trim() || undefined,
    steam: f.steam.trim() || undefined,
    itch: f.itch.trim() || undefined,
    buildLog: f.buildLog,
  }
}

/** A URL name from a title in Latin letters: "Night Market Keeper!" → night-market-keeper. */
export function slugify(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '')
}

/** The input for a field path the Worker rejected, e.g. genres.2 or buildLog.1.version. */
export function fieldId(field: string): string {
  const [head, i, sub] = field.split('.')
  if (head === 'buildLog') return sub ? `f-log-${i}-${sub}` : 'f-log-add'
  if (head === 'feedbackWanted') return 'f-feedback'
  // One input holds every genre, paragraph and platform.
  return `f-${head}`
}

const LABELS: Record<string, MessageKey> = {
  'f-slug': 'gameForm.slug',
  'f-title': 'gameForm.title',
  'f-titleEn': 'gameForm.titleEn',
  'f-studio': 'gameForm.studio',
  'f-team': 'gameForm.team',
  'f-status': 'gameForm.status',
  'f-genres': 'gameForm.genres',
  'f-platforms': 'gameForm.platforms',
  'f-cover': 'gameForm.cover',
  'f-pitch': 'gameForm.pitch',
  'f-description': 'gameForm.description',
  'f-feedback': 'gameForm.feedback',
  'f-thread': 'gameForm.thread',
  'f-steam': 'gameForm.steam',
  'f-itch': 'gameForm.itch',
  'f-log-add': 'gameForm.log',
}

const LOG_LABELS: Record<string, MessageKey> = {
  version: 'gameForm.version',
  date: 'gameForm.date',
  note: 'gameForm.note',
}

/** The name of the field an input belongs to, for a message that says where the problem is. */
export function labelOf(id: string) {
  const row = id.match(/^f-log-(\d+)-(\w+)$/)
  if (row) {
    const field = LOG_LABELS[row[2]!]
    return `${t('gameForm.logRow', { n: Number(row[1]) + 1 })} ${field ? t(field) : ''}`.trim()
  }
  const key = LABELS[id]
  return key ? t(key) : ''
}

const REASONS: Record<string, MessageKey> = {
  required: 'form.error.required',
  tooLong: 'form.error.tooLong',
  tooMany: 'form.error.tooMany',
  tooFew: 'form.error.tooFew',
  format: 'form.error.format',
  date: 'form.error.date',
  thread: 'form.error.thread',
  steam: 'form.error.steam',
  itch: 'form.error.itch',
  itchUnavailable: 'form.error.itchUnavailable',
  cover: 'form.error.cover',
  slug: 'form.error.slug',
  slugTaken: 'form.error.slugTaken',
  image: 'form.error.image',
  imageTooLarge: 'form.error.imageTooLarge',
}

/** Why the Worker rejected a field, in the page's language (its zh-TW text for a reason the page doesn't know). */
export function reason(e: ApiError) {
  const key = REASONS[e.code]
  return key ? t(key, e.params) : e.message
}
