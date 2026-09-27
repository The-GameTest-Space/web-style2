// Each page's own title, description and link preview, written into the
// site's index.html so search engines and link previews (Discord, LINE,
// Facebook), which may not run the app, see them. index.html itself carries
// the home page's. The app sets the same tab titles as people move around
// (src/router/index.ts). A page can also carry the API response it would
// fetch first, so it renders without waiting for one (src/api/client.ts).

import { jsonLdScript } from './jsonld'

export const SITE_NAME = 'Game Test Space'

export interface PageMeta {
  /** The page's own title, without the site name. */
  title: string
  description: string
  /** Where the page lives, without the query. */
  url: string
  /** An absolute image URL for link previews; the site icon when left out. */
  image?: string
  /** JSON-LD for the head. */
  ld?: unknown
  /** The API response the page fetches first: its URL and body. */
  data?: { url: string; body: unknown }
}

/** Pages whose text never changes, by path. */
export const FIXED_PAGES: Record<string, Pick<PageMeta, 'title' | 'description'>> = {
  '/events': {
    title: 'Game Dev Events in Taiwan',
    description:
      'Game jams, meetups, expos, talks and playtest sessions for game developers in Taiwan, with dates, venues and links to sign up.',
  },
  '/games': {
    title: 'Indie Games from Taiwan',
    description:
      "Games in development by Taiwan's indie developers, looking for playtesters. Try a build and tell the team what you think.",
  },
}

const attr = (s: string) => s.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`)

/** `page` (index.html) with `meta` in its head. */
export function withMeta(page: Response, meta: PageMeta, origin: string) {
  const image = meta.image ?? `${origin}/icon-512.png`
  // setAttribute escapes only the quote; text such as "&copy;" must stay text.
  const content = (value: string) => ({
    element: (el: Element) => void el.setAttribute('content', value.replace(/&/g, '&amp;')),
  })
  const added = [
    `<link rel="canonical" href="${attr(meta.url)}">`,
    `<meta property="og:url" content="${attr(meta.url)}">`,
    `<meta property="og:image" content="${attr(image)}">`,
    // A cover shows large; the square site icon as a thumbnail.
    `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}">`,
    meta.ld ? jsonLdScript(meta.ld) : '',
    // `<` escaped so the data cannot close the tag.
    meta.data
      ? `<script type="application/json" id="api-data" data-url="${attr(meta.data.url)}">${JSON.stringify(meta.data.body).replace(/</g, '\\u003c')}</script>`
      : '',
  ].join('')
  return new HTMLRewriter()
    .on('title', { element: (el) => void el.setInnerContent(`${meta.title} | ${SITE_NAME}`) })
    .on('meta[name="description"]', content(meta.description))
    .on('meta[property="og:title"]', content(meta.title))
    .on('meta[property="og:description"]', content(meta.description))
    .on('head', { element: (head) => void head.append(added, { html: true }) })
    .transform(page)
}
