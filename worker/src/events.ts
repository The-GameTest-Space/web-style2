import { COVER_PATH } from './covers'
import type { Doc } from './firestore'
import { DEFAULT_LOCALE, TRANSLATED, type Locale } from '../../src/i18n/locales'

// Events live at events/{slug}. The Worker is their only reader and writer
// (firestore.rules denies clients), so everything an admin sends is checked
// here. The shape matches GameEvent / AdminEvent in src/api/types.ts.

export const EVENT_TYPES = ['jam', 'meetup', 'expo', 'talk', 'playtest']
// Must match COUNTRIES in src/utils/country.ts.
export const COUNTRIES = ['TW', 'JP', 'KR', 'CN', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID']
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Every field an admin edits. Saving writes all of them, so a cleared field is removed. */
export const EVENT_FIELDS = [
  'title',
  'type',
  'country',
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
  'cover',
  'published',
]

/**
 * The fields a save writes. The translations only when the form sent them: a
 * page opened before they existed sends none, and must not erase them.
 */
export const savedFields = (body: unknown) =>
  (body as { i18n?: unknown } | null)?.i18n === undefined ? EVENT_FIELDS : [...EVENT_FIELDS, 'i18n']

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

function isWebUrl(s: string, protocols: string[]) {
  try {
    return protocols.includes(new URL(s).protocol)
  } catch {
    return false
  }
}

/** Validate an admin's event body into what is stored (dates as Date, empty optionals left out). */
export function parseEvent(input: unknown) {
  const body = record(input, 'body')

  const type = body.type
  if (typeof type !== 'string' || !EVENT_TYPES.includes(type)) throw new Invalid('type', '請選擇活動類型')
  // Older clients send no country; their events are in Taiwan.
  const country = body.country ?? 'TW'
  if (typeof country !== 'string' || !COUNTRIES.includes(country)) throw new Invalid('country', '請選擇國家')

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
  if (url && !isWebUrl(url, ['http:', 'https:'])) throw new Invalid('url', '請輸入以 https:// 開頭的完整網址')

  // An uploaded image (/api/covers/…) or a picture elsewhere, over https so
  // the page never loads it insecurely.
  const cover = text(body.cover, 'cover', 500, true)
  if (cover && !COVER_PATH.test(cover) && !isWebUrl(cover, ['https:'])) {
    throw new Invalid('cover', '請上傳圖片，或輸入以 https:// 開頭的圖片網址')
  }

  const i18n = parseTranslations(body.i18n)

  return {
    title: text(body.title, 'title', 120),
    type,
    country,
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
    cover,
    // Left out when there are none, so saving deletes the field.
    i18n: Object.keys(i18n).length ? i18n : undefined,
    published: bool(body.published, 'published'),
  }
}

/**
 * An admin's translations, i18n.{en,ja,ko}, with the same limits as the
 * Chinese fields. Only the title and summary are required; a language with
 * nothing filled in is dropped. See EventText in src/api/types.ts.
 */
function parseTranslations(v: unknown) {
  const out: Record<string, Record<string, unknown>> = {}
  if (v === undefined || v === null) return out
  for (const [lang, value] of Object.entries(record(v, 'i18n'))) {
    const at = `i18n.${lang}`
    if (!(TRANSLATED as string[]).includes(lang)) throw new Invalid(at, '不支援這個語言')
    const t = record(value, at)
    const field = (name: string, max: number) => text(t[name], `${at}.${name}`, max, true)
    // Row for row with the zh-TW agenda. A row can wait for its translation
    // (an empty item), so adding a zh-TW row never blocks saving.
    const agenda = array(t.agenda, `${at}.agenda`, 40).map((row, i) => {
      const r = record(row, `${at}.agenda.${i}`)
      return {
        time: text(r.time, `${at}.agenda.${i}.time`, 40),
        item: text(r.item, `${at}.agenda.${i}.item`, 200, true) ?? '',
      }
    })
    const audience = array(t.audience, `${at}.audience`, 20).map((a, i) => text(a, `${at}.audience.${i}`, 60))
    const parsed = {
      title: field('title', 120),
      summary: field('summary', 300),
      city: field('city', 40),
      venue: field('venue', 120),
      fee: field('fee', 60),
      description: field('description', 20000),
      schedule: field('schedule', 60),
      deadlineLabel: field('deadlineLabel', 20),
      agenda: agenda.some((a) => a.item) ? agenda : undefined,
      audience: audience.length ? audience : undefined,
    }
    if (Object.values(parsed).every((x) => x === undefined)) continue
    if (!parsed.title) throw new Invalid(`${at}.title`, '有翻譯時，名稱為必填')
    if (!parsed.summary) throw new Invalid(`${at}.summary`, '有翻譯時，摘要為必填')
    out[lang] = parsed
  }
  return out
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Events saved before descriptions were HTML hold a list of plain paragraphs. */
function withHtmlDescription(data: Record<string, unknown>) {
  const d = data.description
  if (!Array.isArray(d)) return data
  return { ...data, description: d.map((p) => `<p>${escapeHtml(String(p))}</p>`).join('') }
}

/**
 * The public shape: slug from the document ID, admin-only fields dropped. It
 * still holds every translation; localizeEvent picks one before it is sent.
 */
export function publicEvent({ id, data }: Doc) {
  const { published: _published, createdAt: _createdAt, updatedAt: _updatedAt, ...event } = withHtmlDescription(data)
  return { slug: id, ...event }
}

export const adminEvent = ({ id, data }: Doc) => ({ slug: id, ...withHtmlDescription(data) })

type Translation = Record<string, unknown> & { deadlineLabel?: string; agenda?: unknown[]; audience?: unknown[] }

/**
 * A public event (publicEvent) with its text in `locale`, as far as it has a
 * translation, and `lang` saying which language the text is in. A translated
 * event names the fields still in zh-TW in `untranslated`: those its
 * translation leaves out, and an agenda until each of its rows is
 * translated. Dates, places' codes and links have no language.
 */
export function localizeEvent(event: Record<string, unknown>, locale: Locale) {
  const { i18n, ...base } = event
  const t = locale === DEFAULT_LOCALE ? undefined : (i18n as Record<string, Translation> | undefined)?.[locale]
  if (!t) return { ...base, lang: DEFAULT_LOCALE }

  const out: Record<string, unknown> = { ...base, lang: locale }
  const untranslated: string[] = []
  for (const f of ['title', 'summary', 'city', 'venue', 'fee', 'description', 'schedule']) {
    if (base[f] === undefined) continue
    if (typeof t[f] === 'string') out[f] = t[f]
    else untranslated.push(f)
  }
  if (base.deadline) {
    if (t.deadlineLabel) out.deadline = { ...(base.deadline as object), label: t.deadlineLabel }
    else untranslated.push('deadlineLabel')
  }
  if (Array.isArray(base.agenda) && base.agenda.length) {
    const rows = t.agenda as { item?: string }[] | undefined
    if (rows?.length === base.agenda.length && rows.every((r) => r.item)) out.agenda = rows
    else untranslated.push('agenda')
  }
  if (Array.isArray(base.audience) && base.audience.length) {
    if (t.audience?.length) out.audience = t.audience
    else untranslated.push('audience')
  }
  return untranslated.length ? { ...out, untranslated } : out
}

/** By start time; events without one (ongoing) come first. */
export const byStart = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  String(a.startsAt ?? '').localeCompare(String(b.startsAt ?? ''))
