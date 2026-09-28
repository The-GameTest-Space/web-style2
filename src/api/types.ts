import type { Locale, TranslatedLocale } from '@/i18n/locales'

export type GameStatus = 'seeking' | 'released'

export interface BuildNote {
  version: string
  /** The day of the update, YYYY-MM-DD. */
  date: string
  note: string
}

/**
 * A game as the site shows it. Members of the Discord server upload them
 * (worker/src/games.ts); the text is shown as its owner wrote it, in every
 * language.
 */
export interface Game {
  slug: string
  title: string
  titleEn?: string
  studio: string
  /** How big the team is, in words: 個人開發, 3 人團隊. */
  team?: string
  genres: string[]
  platforms: string[]
  /** The newest update's version. */
  build: string
  status: GameStatus
  /** Cover picture: an upload (/api/covers/…) or an https URL. */
  cover: string
  pitch: string
  /** Plain text, one string per paragraph. */
  description: string[]
  feedbackWanted: string[]
  /**
   * The game's thread in the community's Discord server. The only link a
   * game carries: builds are shared in Discord, never through the site.
   */
  thread?: string
  /**
   * Orange dot stickers on the card: playtesters so far. Only the sample
   * games have a count; nothing counts real ones yet.
   */
  dots?: number
  /** The newest update's day, YYYY-MM-DD. */
  updatedAt: string
  /** Newest first. */
  buildLog: BuildNote[]
  /** The game an admin pinned to the top of the wall. */
  pinned?: boolean
}

/** What the upload form sends; the Worker validates it and keeps the update log newest first. */
export interface GameInput {
  slug: string
  title: string
  titleEn?: string
  studio: string
  team?: string
  status: GameStatus
  genres: string[]
  platforms: string[]
  cover: string
  pitch: string
  description: string[]
  feedbackWanted: string[]
  thread?: string
  buildLog: BuildNote[]
}

/** A game as its owner and the admins see it: everything stored. */
export interface OwnGame extends GameInput {
  build: string
  ownerUid: string
  /** The uploader's Discord name when they uploaded it. */
  ownerName: string
  /** Taken off the site by an admin. */
  hidden: boolean
  createdAt: string
  /** When it was last saved (not the update log's newest day). */
  updatedAt: string
}

export type EventType = 'jam' | 'meetup' | 'expo' | 'talk' | 'playtest'

/** Where an event takes place, as an ISO 3166 code. Labels are in src/utils/country.ts. */
export type Country = 'TW' | 'JP' | 'KR' | 'CN' | 'SG' | 'MY' | 'TH' | 'VN' | 'PH' | 'ID'

interface EventBase {
  slug: string
  title: string
  type: EventType
  /** Missing on events saved before countries were recorded: those are in Taiwan (see countryOf). */
  country?: Country
  city: string
  venue: string
  online: boolean
  fee: string
  summary: string
  /** HTML written by an admin. Render it only through safeHtml (src/utils/html.ts). */
  description?: string
  agenda?: { time: string; item: string }[]
  audience: string[]
  /** The organiser's own page: registration, tickets, full details. */
  url?: string
  /** Cover picture: an upload (/api/covers/…) or an https URL. */
  cover?: string
  /**
   * The language the API sent the text in: the page's if the event has a
   * translation, zh-TW if not. Missing on sample events, which are zh-TW.
   */
  lang?: Locale
  /** In a translated event, the fields the translation leaves out, still in zh-TW. */
  untranslated?: TextField[]
}

/**
 * An event's text in another language, written by an admin. Only the title
 * and summary are required; what it leaves out shows in zh-TW. The agenda
 * follows the zh-TW one row for row, and shows once every row has an item.
 */
export interface EventText {
  title: string
  summary: string
  city?: string
  venue?: string
  fee?: string
  description?: string
  schedule?: string
  deadlineLabel?: string
  agenda?: { time: string; item: string }[]
  audience?: string[]
}

export type TextField = keyof EventText

/** An event on given dates. */
export interface DatedEvent extends EventBase {
  ongoing?: false
  startsAt: string
  endsAt?: string
  deadline?: { label: string; date: string }
  schedule?: never
}

/** An event with no end (a weekly night, an open call). It never expires. */
export interface OngoingEvent extends EventBase {
  ongoing: true
  /** When it happens, in words, e.g. 每週五 20:00. */
  schedule: string
  /** The day it began, if the admin gave one. */
  startsAt?: string
  endsAt?: never
  deadline?: never
}

export type GameEvent = DatedEvent | OngoingEvent

/** An event as the admin pages see it, drafts included. */
export type AdminEvent = GameEvent & {
  published: boolean
  i18n?: Translations
  createdAt?: string
  updatedAt?: string
}

/** An event's translations, by language. */
export type Translations = Partial<Record<TranslatedLocale, EventText>>

/** What the admin form sends; the Worker validates it and stamps the times. */
export interface EventInput extends EventBase {
  ongoing: boolean
  schedule?: string
  startsAt?: string
  endsAt?: string
  deadline?: { label: string; date: string }
  /** Replaces all of them; the Worker leaves them as they are when it is left out. */
  i18n?: Translations
  published: boolean
}

// `sample` is set only by the local-only fallback (src/mocks/fallback.ts),
// so pages can label sample content as such.
export interface ListResponse<T> {
  sample?: boolean
  items: T[]
}

export interface ItemResponse<T> {
  sample?: boolean
  item: T
}
