// The page's language comes from its URL (./locales.ts) and stays until the
// next page load: switching languages goes to the same page under another
// prefix. So `t` needs no reactivity, only the messages loaded before the app
// mounts (main.ts). Admin pages are Chinese only and keep their text inline.

import zhTW from './messages/zh-TW'
import { DEFAULT_LOCALE, LOCALE_INFO, prefix, splitPath, type Locale, type MessageKey, type Messages } from './locales'
import { discordReturnTo } from '@/composables/useAuth'

export type { Locale, MessageKey } from './locales'

const urlLocale = splitPath(location.pathname).locale

/** The router works under the URL's prefix: '/ja/' for /ja/events. */
export const routerBase = `${prefix(urlLocale)}${import.meta.env.BASE_URL}`

/**
 * The page's language. The Discord sign-in callback has a single registered
 * URL for every language; it speaks the language of the page sign-in began on.
 */
export const locale: Locale =
  location.pathname === `${import.meta.env.BASE_URL}auth/discord/callback`
    ? splitPath(discordReturnTo() ?? '/').locale
    : urlLocale

document.documentElement.lang = LOCALE_INFO[locale].htmlLang

const LOADERS: Record<Exclude<Locale, typeof DEFAULT_LOCALE>, () => Promise<{ default: Messages }>> = {
  en: () => import('./messages/en'),
  ja: () => import('./messages/ja'),
  ko: () => import('./messages/ko'),
}

let messages: Messages = zhTW

/** Load the page's messages. Call once, before the app mounts. */
export async function loadMessages() {
  if (locale !== DEFAULT_LOCALE) messages = (await LOADERS[locale]()).default
}

const plurals = new Intl.PluralRules(locale)

/** A message's text before its {names} are filled in; `n` picks the plural form. */
export function template(key: MessageKey, n?: number) {
  const msg = messages[key]
  if (typeof msg === 'string') return msg
  return msg[plurals.select(n ?? 0)] ?? msg.other
}

/** A message in the page's language, with its {names} filled from `params`. */
export function t(key: MessageKey, params: Record<string, string | number> = {}) {
  const n = typeof params.n === 'number' ? params.n : undefined
  return template(key, n).replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m))
}
