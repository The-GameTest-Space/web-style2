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
  'ongoing',
  'schedule',
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

  // An ongoing event has a schedule in words instead of dates: its start (the
  // day it began) is optional, and end and deadline are dropped.
  const ongoing = body.ongoing === undefined || body.ongoing === null ? false : bool(body.ongoing, 'ongoing')
  const schedule = ongoing ? text(body.schedule, 'schedule', 60) : undefined
  const startsAt = ongoing ? date(body.startsAt, 'startsAt', true) : date(body.startsAt, 'startsAt')
  const endsAt = ongoing ? undefined : date(body.endsAt, 'endsAt', true)
  if (startsAt && endsAt && endsAt < startsAt) throw new Invalid('endsAt', '結束時間不能早於開始時間')

  let deadline: { label: string; date: Date } | undefined
  if (!ongoing && body.deadline !== undefined && body.deadline !== null) {
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
    ongoing: ongoing || undefined,
    schedule,
    city: text(body.city, 'city', 40),
    venue: text(body.venue, 'venue', 120),
    online: bool(body.online, 'online'),
    fee: text(body.fee, 'fee', 60),
    deadline,
    summary: text(body.summary, 'summary', 300),
    // HTML. The site sanitizes it when rendering (src/utils/html.ts).
    description: text(body.description, 'description', 20000, true),
    agenda: agenda.length ? agenda : undefined,
    audience: array(body.audience, 'audience', 20).map((a, i) => text(a, `audience.${i}`, 60)),
    url,
    published: bool(body.published, 'published'),
  }
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Events saved before descriptions were HTML hold a list of plain paragraphs. */
function withHtmlDescription(data: Record<string, unknown>) {
  const d = data.description
  if (!Array.isArray(d)) return data
  return { ...data, description: d.map((p) => `<p>${escapeHtml(String(p))}</p>`).join('') }
}

/** The public shape: slug from the document ID, admin-only fields dropped. */
export function publicEvent({ id, data }: Doc) {
  const { published: _published, createdAt: _createdAt, updatedAt: _updatedAt, ...event } = withHtmlDescription(data)
  return { slug: id, ...event }
}

export const adminEvent = ({ id, data }: Doc) => ({ slug: id, ...withHtmlDescription(data) })

/** By start time; events without one (ongoing) come first. */
export const byStart = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  String(a.startsAt ?? '').localeCompare(String(b.startsAt ?? ''))
