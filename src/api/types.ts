export type GameStatus = 'seeking' | 'released'

export interface BuildNote {
  version: string
  date: string
  note: string
}

export interface Game {
  slug: string
  title: string
  titleEn: string
  studio: string
  team: string
  genres: string[]
  platforms: string[]
  build: string
  status: GameStatus
  cover: string
  pitch: string
  description: string[]
  feedbackWanted: string[]
  /** Orange dot stickers on the card: playtesters so far. */
  dots: number
  updatedAt: string
  buildLog: BuildNote[]
}

export type EventType = 'jam' | 'meetup' | 'expo' | 'talk' | 'playtest'

interface EventBase {
  slug: string
  title: string
  type: EventType
  city: string
  venue: string
  online: boolean
  fee: string
  summary: string
  description: string[]
  agenda?: { time: string; item: string }[]
  audience: string[]
  /** The organiser's own page: registration, tickets, full details. */
  url?: string
}

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
  createdAt?: string
  updatedAt?: string
}

/** What the admin form sends; the Worker validates it and stamps the times. */
export interface EventInput extends EventBase {
  ongoing: boolean
  schedule?: string
  startsAt?: string
  endsAt?: string
  deadline?: { label: string; date: string }
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
