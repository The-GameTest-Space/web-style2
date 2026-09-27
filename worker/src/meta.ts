// Each page's own language, title, description and link preview, written into
// the site's index.html so search engines and link previews (Discord, LINE,
// Facebook), which may not run the app, see them. index.html itself carries
// the zh-TW home page's. Every page exists in each of the site's languages,
// under its prefix (src/i18n/locales.ts); the head links them to each other.
// The app sets the same tab titles as people move around (src/router/index.ts)
// from the same messages. A page can also carry the API response it would
// fetch first, so it renders without waiting for one (src/api/client.ts).

import { jsonLdScript } from './jsonld'
import { FALLBACK_LOCALE, LOCALES, LOCALE_INFO, localePath, type Locale, type Messages } from '../../src/i18n/locales'
import zhTW from '../../src/i18n/messages/zh-TW'
import en from '../../src/i18n/messages/en'
import ja from '../../src/i18n/messages/ja'
import ko from '../../src/i18n/messages/ko'

export const SITE_NAME = 'Game Test Space'

const MESSAGES: Record<Locale, Messages> = { 'zh-TW': zhTW, en, ja, ko }

export interface PageMeta {
  locale: Locale
  /** The page's path without its language prefix, e.g. /events. */
  path: string
  /** The page's own title, without the site name. */
  title: string
  description: string
  /** The home page's tab title puts the site name first. */
  home?: boolean
  /** An absolute image URL for link previews; the site icon when left out. */
  image?: string
  /** JSON-LD for the head. */
  ld?: unknown
  /** The API response the page fetches first: its URL and body. */
  data?: { url: string; body: unknown }
}

/** Where a page lives in a language: https://…/ja/events. */
export const pageUrl = (origin: string, locale: Locale, path: string) => origin + localePath(locale, path)

/** The title and description of a page whose text never changes, by path without the prefix. */
export function fixedPage(locale: Locale, path: string): Pick<PageMeta, 'title' | 'description' | 'home'> | undefined {
  const m = MESSAGES[locale]
  if (path === '/') return { title: m['site.tagline'], description: m['meta.home.description'], home: true }
  if (path === '/events') return { title: m['meta.events.title'], description: m['meta.events.description'] }
  if (path === '/games') return { title: m['meta.games.title'], description: m['meta.games.description'] }
  return undefined
}

/** A page in every language, plus the one for people whose language the site doesn't have. */
export function alternates(origin: string, path: string) {
  return [
    ...LOCALES.map((l) => ({ hreflang: LOCALE_INFO[l].hreflang, href: pageUrl(origin, l, path) })),
    { hreflang: 'x-default', href: pageUrl(origin, FALLBACK_LOCALE, path) },
  ]
}

const attr = (s: string) => s.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * `page` (index.html) in `locale`, with `meta` in its head. A page without
 * meta of its own (an unknown event, a 404) only gets its language.
 */
export function withMeta(page: Response, locale: Locale, origin: string, meta: PageMeta | null) {
  const rewriter = new HTMLRewriter().on('html', {
    element: (el) => void el.setAttribute('lang', LOCALE_INFO[locale].htmlLang),
  })
  if (!meta) return rewriter.transform(page)

  const url = pageUrl(origin, locale, meta.path)
  const image = meta.image ?? `${origin}/icon-512.png`
  // setAttribute escapes only the quote; text such as "&copy;" must stay text.
  const content = (value: string) => ({
    element: (el: Element) => void el.setAttribute('content', value.replace(/&/g, '&amp;')),
  })
  const added = [
    `<link rel="canonical" href="${attr(url)}">`,
    ...alternates(origin, meta.path).map(
      ({ hreflang, href }) => `<link rel="alternate" hreflang="${hreflang}" href="${attr(href)}">`,
    ),
    `<meta property="og:url" content="${attr(url)}">`,
    `<meta property="og:locale" content="${LOCALE_INFO[locale].ogLocale}">`,
    ...LOCALES.filter((l) => l !== locale).map(
      (l) => `<meta property="og:locale:alternate" content="${LOCALE_INFO[l].ogLocale}">`,
    ),
    `<meta property="og:image" content="${attr(image)}">`,
    // A cover shows large; the square site icon as a thumbnail.
    `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}">`,
    meta.ld ? jsonLdScript(meta.ld) : '',
    // `<` escaped so the data cannot close the tag.
    meta.data
      ? `<script type="application/json" id="api-data" data-url="${attr(meta.data.url)}">${JSON.stringify(meta.data.body).replace(/</g, '\\u003c')}</script>`
      : '',
  ].join('')
  const title = meta.home ? `${SITE_NAME} | ${meta.title}` : `${meta.title} | ${SITE_NAME}`
  return rewriter
    .on('title', { element: (el) => void el.setInnerContent(title) })
    .on('meta[name="description"]', content(meta.description))
    .on('meta[property="og:title"]', content(meta.title))
    .on('meta[property="og:description"]', content(meta.description))
    .on('head', { element: (head) => void head.append(added, { html: true }) })
    .transform(page)
}
