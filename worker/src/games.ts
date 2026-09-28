import { COVER_PATH } from './covers'
import { GUILD_ID } from './discord'
import type { Doc } from './firestore'
import { Invalid, array, isWebUrl, record, text } from './validate'

// Games live at games/{slug}. Members of the community's Discord server
// upload them and edit their own (ownerUid); admins can hide any of them and
// pin one (settings/games). The Worker is their only reader and writer
// (firestore.rules denies clients), so everything sent is checked here. The
// shapes match Game, GameInput and OwnGame in src/api/types.ts.

export const GAME_STATUSES = ['seeking', 'released']
// Must match PLATFORMS in src/views/member/gameForm.ts.
export const PLATFORMS = ['PC', 'Mac', 'Linux', 'Web', 'iOS', 'Android', 'Switch', 'PlayStation', 'Xbox', 'VR']
/** Paths the site's own pages use under /games/. */
export const RESERVED_SLUGS = ['new']
/** How many games one member may upload; admins have no limit. */
export const MAX_GAMES_PER_MEMBER = 10
/**
 * A thread (or a message in one) in the community's Discord server, as
 * Discord's "Copy Link" gives it. The only link a game may carry: builds are
 * shared in Discord, never through the site.
 */
const THREAD = new RegExp(`^https://(?:(?:ptb|canary)\\.)?discord(?:app)?\\.com/channels/${GUILD_ID}/\\d+(?:/\\d+)?/?$`)

/** Every field an owner edits. Saving writes all of them, so a cleared optional field is removed. */
export const GAME_FIELDS = [
  'title',
  'titleEn',
  'studio',
  'team',
  'status',
  'genres',
  'platforms',
  'cover',
  'pitch',
  'description',
  'feedbackWanted',
  'thread',
  'buildLog',
]

export interface BuildNote {
  version: string
  /** The day of the update, YYYY-MM-DD. */
  date: string
  note: string
}

/** A list of `min` to `max` items, each checked by `each` under its own path (genres.2). Duplicates are dropped. */
function items<T>(v: unknown, field: string, min: number, max: number, each: (v: unknown, at: string) => T): T[] {
  const list = array(v, field, max).map((x, i) => each(x, `${field}.${i}`))
  if (list.length < min) {
    throw min === 1 ? new Invalid(field, '此欄位為必填', 'required') : new Invalid(field, `至少 ${min} 項`, 'tooFew', { min })
  }
  return list
}

const unique = <T>(list: T[]) => [...new Set(list)]

function day(v: unknown, field: string) {
  const s = text(v, field, 10)
  const d = new Date(`${s}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw new Invalid(field, '日期格式不正確', 'date')
  }
  return s
}

/** Validate a member's game body into what is stored (empty optionals left out, newest update first). */
export function parseGame(input: unknown) {
  const body = record(input, 'body')

  const status = body.status
  if (typeof status !== 'string' || !GAME_STATUSES.includes(status)) throw new Invalid('status', '請選擇狀態', 'required')

  const platforms = items(body.platforms, 'platforms', 1, PLATFORMS.length, (p, at) => {
    if (typeof p !== 'string' || !PLATFORMS.includes(p)) throw new Invalid(at, '不支援這個平台')
    return p
  })

  const thread = text(body.thread, 'thread', 200, true)
  if (thread && !THREAD.test(thread)) throw new Invalid('thread', '請貼上本社群 Discord 伺服器中討論串的連結', 'thread')

  // An uploaded image (/api/covers/…) or a picture elsewhere, over https so
  // the page never loads it insecurely. Every game card shows one.
  const cover = text(body.cover, 'cover', 500)
  if (!COVER_PATH.test(cover) && !isWebUrl(cover, ['https:'])) {
    throw new Invalid('cover', '請上傳圖片，或輸入以 https:// 開頭的圖片網址', 'cover')
  }

  const buildLog: BuildNote[] = items(body.buildLog, 'buildLog', 1, 50, (row, at) => {
    const r = record(row, at)
    return { version: text(r.version, `${at}.version`, 24), date: day(r.date, `${at}.date`), note: text(r.note, `${at}.note`, 300) }
  })

  return {
    title: text(body.title, 'title', 60),
    titleEn: text(body.titleEn, 'titleEn', 80, true),
    studio: text(body.studio, 'studio', 60),
    team: text(body.team, 'team', 30, true),
    status,
    genres: unique(items(body.genres, 'genres', 1, 5, (g, at) => text(g, at, 16))),
    platforms: unique(platforms),
    cover,
    pitch: text(body.pitch, 'pitch', 120),
    // Plain text, one string per paragraph; never HTML.
    description: items(body.description, 'description', 1, 20, (p, at) => text(p, at, 1000)),
    feedbackWanted: items(body.feedbackWanted, 'feedbackWanted', 1, 5, (q, at) => text(q, at, 80)),
    thread,
    // Newest first, after checking, so a rejected row keeps the index the form sent.
    buildLog: buildLog.sort((a, b) => b.date.localeCompare(a.date)),
  }
}

/** The slug in settings/games, or null when no game is pinned. */
export const pinnedOf = (settings: Doc | null) =>
  typeof settings?.data.pinned === 'string' ? settings.data.pinned : null

const logOf = (data: Record<string, unknown>) => (Array.isArray(data.buildLog) ? (data.buildLog as BuildNote[]) : [])

/**
 * The public shape: slug from the document ID, the current version and date
 * from the newest update, owner and moderation fields dropped.
 */
export function publicGame({ id, data }: Doc, pinned: string | null) {
  const {
    ownerUid: _ownerUid,
    ownerName: _ownerName,
    hidden: _hidden,
    createdAt,
    updatedAt: _updatedAt,
    ...game
  } = data
  const latest = logOf(data)[0]
  return {
    slug: id,
    ...game,
    build: latest?.version ?? '',
    updatedAt: latest?.date ?? String(createdAt ?? '').slice(0, 10),
    ...(id === pinned && { pinned: true }),
  }
}

/** Everything stored, for the game's owner and for admins. */
export const fullGame = ({ id, data }: Doc) => ({ slug: id, ...data, build: logOf(data)[0]?.version ?? '' })

/** The pinned game first, then by newest update. */
export const byPinnedThenRecent = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  Number(!!b.pinned) - Number(!!a.pinned) || String(b.updatedAt).localeCompare(String(a.updatedAt))

/** Most recently saved first. */
export const bySaved = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''))
