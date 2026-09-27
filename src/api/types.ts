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
  /** Orange dot stickers on the card: playtesters so far (sample data). */
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
}

export interface ListResponse<T> {
  sample: boolean
  items: T[]
}

export interface ItemResponse<T> {
  sample: boolean
  item: T
}
