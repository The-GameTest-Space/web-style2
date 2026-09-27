import type { GameEvent, TextField } from '@/api/types'
import { DEFAULT_LOCALE, LOCALE_INFO } from '@/i18n/locales'

/**
 * The lang attribute for one of an event's text fields: the language the API
 * sent it in (localizeEvent in worker/src/events.ts). Chinese text left on a
 * ja or ko page then keeps Chinese forms, and screen readers read each field
 * in its own language.
 */
export function textLang(e: GameEvent, field: TextField) {
  const lang = e.lang && !e.untranslated?.includes(field) ? e.lang : DEFAULT_LOCALE
  return LOCALE_INFO[lang].htmlLang
}
