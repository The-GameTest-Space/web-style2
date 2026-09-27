import type { Translations } from '@/api/types'
import { TRANSLATED, type TranslatedLocale } from '@/i18n/locales'
import { asHtml } from '@/utils/html'

// An event's translations as the admin form holds them (AdminEventEditView),
// one per language whether it has one or not. Lists are plain text, and the
// agenda has a row for each row of the zh-TW agenda.

export interface TextForm {
  title: string
  summary: string
  city: string
  venue: string
  fee: string
  description: string
  schedule: string
  deadlineLabel: string
  agenda: { time: string; item: string }[]
  audience: string
}

export type TextForms = Record<TranslatedLocale, TextForm>

export const blankRow = () => ({ time: '', item: '' })

export function toTextForms(i18n: Translations | undefined, agendaRows: number): TextForms {
  const forms = {} as TextForms
  for (const l of TRANSLATED) {
    const t = i18n?.[l]
    forms[l] = {
      title: t?.title ?? '',
      summary: t?.summary ?? '',
      city: t?.city ?? '',
      venue: t?.venue ?? '',
      fee: t?.fee ?? '',
      description: t?.description ?? '',
      schedule: t?.schedule ?? '',
      deadlineLabel: t?.deadlineLabel ?? '',
      agenda: Array.from({ length: agendaRows }, (_, i) => ({ ...(t?.agenda?.[i] ?? blankRow()) })),
      audience: (t?.audience ?? []).join('\n'),
    }
  }
  return forms
}

/** Whether a language has anything filled in. */
export const hasText = (f: TextForm) =>
  [f.title, f.summary, f.city, f.venue, f.fee, f.description, f.schedule, f.deadlineLabel, f.audience].some((s) => s.trim()) ||
  f.agenda.some((a) => a.item.trim())

/**
 * What the form sends: each language with only the fields the event has now
 * (a schedule only if it is ongoing, and so on). An agenda row with no time
 * takes the zh-TW row's; one with no item yet is kept, and the page shows
 * the zh-TW agenda until every row has one. The Worker drops a language
 * left blank.
 */
export function fromTextForms(forms: TextForms, event: { ongoing: boolean; hasDeadline: boolean; agenda: { time: string }[] }) {
  const out: Translations = {}
  for (const l of TRANSLATED) {
    const f = forms[l]
    const agenda = event.agenda.map((row, i) => ({
      time: f.agenda[i]?.time.trim() || row.time,
      item: f.agenda[i]?.item.trim() ?? '',
    }))
    out[l] = {
      title: f.title,
      summary: f.summary,
      city: f.city,
      venue: f.venue,
      fee: f.fee,
      description: asHtml(f.description) || undefined,
      schedule: event.ongoing ? f.schedule : undefined,
      deadlineLabel: !event.ongoing && event.hasDeadline ? f.deadlineLabel : undefined,
      agenda: agenda.some((a) => a.item) ? agenda : undefined,
      audience: f.audience
        .split('\n')
        .map((a) => a.trim())
        .filter(Boolean),
    }
  }
  return out
}
