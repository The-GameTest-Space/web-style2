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

export interface GameEvent {
  slug: string
  title: string
  type: EventType
  startsAt: string
  endsAt?: string
  city: string
  venue: string
  online: boolean
  fee: string
  deadline?: { label: string; date: string }
  summary: string
  description: string[]
  agenda?: { time: string; item: string }[]
  audience: string[]
  /** The organiser's own page: registration, tickets, full details. */
  url?: string
}

/** An event as the admin pages see it, drafts included. */
export interface AdminEvent extends GameEvent {
  published: boolean
  createdAt?: string
  updatedAt?: string
}

/** What the admin form sends; the Worker stamps the times. */
export type EventInput = Omit<AdminEvent, 'createdAt' | 'updatedAt'>

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
