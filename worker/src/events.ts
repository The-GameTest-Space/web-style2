import type { Doc } from './firestore'

// Events live at events/{slug}. The Worker is their only reader and writer
// (firestore.rules denies clients), so everything an admin sends is checked
// here. The shape matches GameEvent / AdminEvent in src/api/types.ts.

export const EVENT_TYPES = ['jam', 'meetup', 'expo', 'talk', 'playtest']
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Every field an admin edits. Saving writes all of them, so a cleared field is removed. */
export const EVENT_FIELDS = [
  'title',
  'type',
  'startsAt',
  'endsAt',
  'city',
  'venue',
  'online',
  'fee',
  'deadline',
  'summary',
  'description',
  'agenda',
  'audience',
  'url',
  'published',
]

/** A rejected field, named by its path in the request body. */
export class Invalid extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message)
  }
}

function text(v: unknown, field: string, max: number): string
function text(v: unknown, field: string, max: number, optional: true): string | undefined
function text(v: unknown, field: string, max: number, optional = false) {
  if (v !== undefined && v !== null && typeof v !== 'string') throw new Invalid(field, '格式不正確')
  const s = (v ?? '').trim()
  if (!s) {
    if (optional) return undefined
    throw new Invalid(field, '此欄位為必填')
  }
  if (s.length > max) throw new Invalid(field, `最多 ${max} 個字`)
  return s
}

function date(v: unknown, field: string): Date
function date(v: unknown, field: string, optional: true): Date | undefined
function date(v: unknown, field: string, optional = false) {
  const s = optional ? text(v, field, 40, true) : text(v, field, 40)
  if (!s) return undefined
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) throw new Invalid(field, '日期格式不正確')
  return d
}

function array(v: unknown, field: string, max: number): unknown[] {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) throw new Invalid(field, '格式不正確')
  if (v.length > max) throw new Invalid(field, `最多 ${max} 項`)
  return v
}

function bool(v: unknown, field: string) {
  if (typeof v !== 'boolean') throw new Invalid(field, '格式不正確')
  return v
}

const record = (v: unknown, field: string) => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Invalid(field, '格式不正確')
  return v as Record<string, unknown>
}

/** Validate an admin's event body into what is stored (dates as Date, empty optionals left out). */
export function parseEvent(input: unknown) {
  const body = record(input, 'body')

  const type = body.type
  if (typeof type !== 'string' || !EVENT_TYPES.includes(type)) throw new Invalid('type', '請選擇活動類型')

  const startsAt = date(body.startsAt, 'startsAt')
  const endsAt = date(body.endsAt, 'endsAt', true)
  if (endsAt && endsAt < startsAt) throw new Invalid('endsAt', '結束時間不能早於開始時間')

  let deadline: { label: string; date: Date } | undefined
  if (body.deadline !== undefined && body.deadline !== null) {
    const d = record(body.deadline, 'deadline')
    deadline = { label: text(d.label, 'deadline.label', 20), date: date(d.date, 'deadline.date') }
  }

  const agenda = array(body.agenda, 'agenda', 40).map((row, i) => {
    const r = record(row, `agenda.${i}`)
    return { time: text(r.time, `agenda.${i}.time`, 40), item: text(r.item, `agenda.${i}.item`, 200) }
  })

  const url = text(body.url, 'url', 500, true)
  if (url) {
    let ok = false
    try {
      ok = ['http:', 'https:'].includes(new URL(url).protocol)
    } catch {
      /* not a URL */
    }
    if (!ok) throw new Invalid('url', '請輸入以 https:// 開頭的完整網址')
  }

  return {
    title: text(body.title, 'title', 120),
    type,
    startsAt,
    endsAt,
    city: text(body.city, 'city', 40),
    venue: text(body.venue, 'venue', 120),
    online: bool(body.online, 'online'),
    fee: text(body.fee, 'fee', 60),
    deadline,
    summary: text(body.summary, 'summary', 300),
    description: array(body.description, 'description', 30).map((p, i) => text(p, `description.${i}`, 2000)),
    agenda: agenda.length ? agenda : undefined,
    audience: array(body.audience, 'audience', 20).map((a, i) => text(a, `audience.${i}`, 60)),
    url,
    published: bool(body.published, 'published'),
  }
}

/** The public shape: slug from the document ID, admin-only fields dropped. */
export function publicEvent({ id, data }: Doc) {
  const { published: _published, createdAt: _createdAt, updatedAt: _updatedAt, ...event } = data
  return { slug: id, ...event }
}

export const adminEvent = ({ id, data }: Doc) => ({ slug: id, ...data })

export const byStart = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  String(a.startsAt).localeCompare(String(b.startsAt))
