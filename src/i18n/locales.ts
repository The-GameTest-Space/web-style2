// The site's languages. zh-TW is the default and has no URL prefix (/events);
// the others live under their own (/en/events, /ja/events). The site is
// served from the root. Plain data, so the Worker shares it
// (worker/src/meta.ts) for each page's <html lang>, title and hreflang links.

import type zhTW from './messages/zh-TW'

export const LOCALES = ['zh-TW', 'en', 'ja', 'ko'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE = 'zh-TW' satisfies Locale
/** Where search engines send people whose language the site doesn't have. */
export const FALLBACK_LOCALE = 'en' satisfies Locale

export const LOCALE_INFO: Record<Locale, { name: string; short: string; htmlLang: string; hreflang: string; ogLocale: string }> = {
  'zh-TW': { name: '繁體中文', short: '中文', htmlLang: 'zh-Hant-TW', hreflang: 'zh-TW', ogLocale: 'zh_TW' },
  en: { name: 'English', short: 'EN', htmlLang: 'en', hreflang: 'en', ogLocale: 'en_US' },
  ja: { name: '日本語', short: '日本語', htmlLang: 'ja', hreflang: 'ja', ogLocale: 'ja_JP' },
  ko: { name: '한국어', short: '한국어', htmlLang: 'ko', hreflang: 'ko', ogLocale: 'ko_KR' },
}

/** The prefix of a locale's pages: '' for the default, '/en' and so on. */
export const prefix = (locale: Locale) => (locale === DEFAULT_LOCALE ? '' : `/${locale}`)

/** A page's path in a locale: localePath('ja', '/events') is '/ja/events'. */
export const localePath = (locale: Locale, path: string) => prefix(locale) + path

/** The languages an event's text can be translated into: all but zh-TW, which admins write in. */
export type TranslatedLocale = Exclude<Locale, typeof DEFAULT_LOCALE>
export const TRANSLATED = LOCALES.filter((l): l is TranslatedLocale => l !== DEFAULT_LOCALE)

/**
 * An events API URL asking for their text in a locale: withLang('/api/events',
 * 'ja') is '/api/events?lang=ja'. The Worker writes a page's first response
 * into it under this same URL, so the page finds it (src/api/client.ts).
 */
export const withLang = (url: string, locale: Locale) => (locale === DEFAULT_LOCALE ? url : `${url}?lang=${locale}`)

const PREFIXED = new RegExp(`^/(${LOCALES.filter((l) => l !== DEFAULT_LOCALE).join('|')})(?=[/?#]|$)(.*)$`)

/** The locale a path is in, and the path without its prefix ('/ja' → '/'). */
export function splitPath(path: string): { locale: Locale; path: string } {
  const m = path.match(PREFIXED)
  if (!m) return { locale: DEFAULT_LOCALE, path }
  const rest = m[2] ?? ''
  return { locale: m[1] as Locale, path: rest.startsWith('/') ? rest : `/${rest}` }
}

/** Every message's key; zh-TW is the source every other language follows. */
export type MessageKey = keyof typeof zhTW

/**
 * A message that changes with a count, passed as `n`: one form per plural
 * category of the language (Intl.PluralRules). Only English needs more than
 * `other`.
 */
export type Plural = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }

/** A language's messages: the same keys as zh-TW, plural where zh-TW's is. */
export type Messages = { [K in MessageKey]: (typeof zhTW)[K] extends string ? string : Plural }
