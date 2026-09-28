import { bearer, verifyIdToken } from './auth'
import { COVER_PATH, MAX_COVER_BYTES, saveCover, serveCover } from './covers'
import { MemberCheckUnavailable, isGuildMember } from './discord'
import { SLUG, adminEvent, byStart, localizeEvent, parseEvent, publicEvent, savedFields } from './events'
import { Firestore, saveUser } from './firestore'
import {
  GAME_FIELDS,
  MAX_GAMES_PER_MEMBER,
  RESERVED_SLUGS,
  byPinnedThenRecent,
  bySaved,
  fullGame,
  parseGame,
  pinnedOf,
  publicGame,
} from './games'
import { eventJsonLd } from './jsonld'
import { alternates, fixedPage, pageUrl, type PageMeta, withMeta } from './meta'
import { DEFAULT_LOCALE, LOCALES, splitPath, withLang, type Locale } from '../../src/i18n/locales'
import { createCustomToken, type ServiceAccount } from './token'
import { Invalid } from './validate'

interface Env {
  DISCORD_CLIENT_SECRET: string
  FIREBASE_SERVICE_ACCOUNT: string
  // The Discord bot's token, for checking who is in the server
  // (worker/src/discord.ts). Without it no one but admins can upload games.
  DISCORD_BOT_TOKEN?: string
  // Per-IP request limit for /api/* (ratelimits in wrangler.jsonc).
  API_LIMIT: RateLimit
  // Event cover images (worker/src/covers.ts), KV namespace event_images.
  COVERS: KVNamespace
  // The built site (dist/), for the event pages this script serves.
  ASSETS: Fetcher
  // Local development only (.dev.vars): use the Firebase emulators, e.g.
  // localhost:8085 and localhost:9099. See README.
  FIRESTORE_EMULATOR_HOST?: string
  FIREBASE_AUTH_EMULATOR_HOST?: string
  // Local development only, with the Auth emulator: Discord user IDs to treat
  // as members of the server (comma-separated) instead of asking the bot.
  // Ignored in production, where there is no emulator.
  DEV_DISCORD_MEMBERS?: string
}

const serviceAccount = (env: Env) => JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount
const firestore = (env: Env) => new Firestore(serviceAccount(env), env.FIRESTORE_EMULATOR_HOST)

// Public; must match DISCORD_CLIENT_ID in src/composables/useAuth.ts.
const DISCORD_CLIENT_ID = '1538119089883455548'
const DISCORD_API = 'https://discord.com/api/v10'

// The callback URLs registered on the Discord app. The dev server reaches
// this Worker through its /api proxy (vite.config.ts).
const REDIRECT_URIS = [
  'http://localhost:5199/auth/discord/callback',
  'https://gtspace.gametestspace.workers.dev/auth/discord/callback',
]

interface DiscordUser {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
}

function avatarUrl(user: DiscordUser) {
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
  // Accounts without an avatar get one of Discord's six default ones.
  return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`
}

function json(body: unknown, status: number) {
  return Response.json(body, { status })
}

/**
 * POST /api/auth/discord { code, redirectUri } → { token, profile }
 * Trades a Discord OAuth2 authorization code for a Firebase custom token for
 * uid `discord:<id>`, plus the Discord name and avatar for the user record,
 * and saves the user to Firestore at users/{uid}.
 */
async function discordSignIn(request: Request, env: Env) {
  const { code, redirectUri } = await request
    .json<{ code?: unknown; redirectUri?: unknown }>()
    .catch(() => ({}) as { code?: unknown; redirectUri?: unknown })
  if (typeof code !== 'string' || typeof redirectUri !== 'string' || !REDIRECT_URIS.includes(redirectUri)) {
    return json({ error: 'invalid_request' }, 400)
  }

  // Discord also checks that redirect_uri equals the one the code was issued for.
  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
    }),
  })
  if (!tokenRes.ok) {
    console.warn('Discord token exchange failed', tokenRes.status, await tokenRes.text())
    return json({ error: 'invalid_grant' }, 401)
  }
  const { access_token } = await tokenRes.json<{ access_token: string }>()

  const meRes = await fetch(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${access_token}` } })
  if (!meRes.ok) {
    console.warn('Discord profile fetch failed', meRes.status)
    return json({ error: 'discord_unavailable' }, 502)
  }
  const me = await meRes.json<DiscordUser>()

  const uid = `discord:${me.id}`
  const displayName = me.global_name ?? me.username
  const photoURL = avatarUrl(me)
  // Record the user before handing out the token; a failure fails the sign-in
  // so no one ends up signed in without a users/{uid} document.
  await saveUser(firestore(env), uid, { discordId: me.id, username: me.username, displayName, photoURL })
  const token = await createCustomToken(serviceAccount(env), uid)
  return json({ token, profile: { displayName, photoURL } }, 200)
}

const notFound = () => json({ error: 'not_found' }, 404)

async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => {
    throw new Invalid('body', '格式不正確')
  })
}

// Every page view lists the published events, and Spark allows 50k document
// reads a day (each listed event is one read), so each isolate keeps the list
// for 5 min: even a steady stream of requests costs 288 lists a day per
// isolate. An admin write clears it here; other isolates catch up when theirs
// expires.
const PUBLIC_TTL = 5 * 60_000
let publicEvents: { at: number; items: Record<string, unknown>[]; updated: Map<string, string> } | null = null

async function publishedEvents(env: Env) {
  if (publicEvents && Date.now() - publicEvents.at < PUBLIC_TTL) return publicEvents
  const docs = await firestore(env).list('events', { field: 'published', value: true })
  publicEvents = {
    at: Date.now(),
    items: docs.map(publicEvent).sort(byStart),
    // For the sitemap: the public shape leaves updatedAt out.
    updated: new Map(docs.map((d) => [d.id, typeof d.data.updatedAt === 'string' ? d.data.updatedAt : ''])),
  }
  return publicEvents
}

// Games, cached the same way. A member's or an admin's write clears it here.
let publicGames: { at: number; items: Record<string, unknown>[] } | null = null

async function listedGames(env: Env) {
  if (publicGames && Date.now() - publicGames.at < PUBLIC_TTL) return publicGames
  const db = firestore(env)
  const [docs, settings] = await Promise.all([db.list('games', { field: 'hidden', value: false }), db.get('settings/games')])
  const pinned = pinnedOf(settings)
  publicGames = { at: Date.now(), items: docs.map((d) => publicGame(d, pinned)).sort(byPinnedThenRecent) }
  return publicGames
}

// Pages with content of their own.
const SITEMAP_PAGES = ['/', '/games', '/events']

/**
 * GET /sitemap.xml: the fixed pages plus every listed game and published
 * event, for search engines, each in every language with links to the others.
 */
async function sitemap(origin: string, env: Env) {
  const [{ items, updated }, games] = await Promise.all([publishedEvents(env), listedGames(env)])
  const pages = [
    ...SITEMAP_PAGES.map((path) => ({ path, lastmod: '' })),
    ...games.items.map(({ slug, updatedAt }) => ({ path: `/games/${slug}`, lastmod: String(updatedAt ?? '') })),
    ...items.map(({ slug }) => ({ path: `/events/${slug}`, lastmod: updated.get(String(slug)) ?? '' })),
  ]
  const urls = pages.flatMap(({ path, lastmod }) => {
    const links = alternates(origin, path)
      .map(({ hreflang, href }) => `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`)
      .join('')
    return LOCALES.map(
      (locale) =>
        `<url><loc>${pageUrl(origin, locale, path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}${links}</url>`,
    )
  })
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}

/**
 * The title, description and markup for a page in a language (`path` without
 * its prefix), or null when it has none of its own.
 */
async function pageMeta(origin: string, locale: Locale, path: string, env: Env): Promise<PageMeta | null> {
  const fixed = fixedPage(locale, path)
  if (fixed) return { ...fixed, locale, path }
  const gameSlug = path.match(/^\/games\/([a-z0-9-]+)$/)?.[1]
  if (gameSlug) {
    const game = (await listedGames(env)).items.find((g) => g.slug === gameSlug)
    if (!game) return null
    const cover = typeof game.cover === 'string' && game.cover
    return {
      locale,
      path,
      title: String(game.title),
      description: String(game.pitch),
      image: cover ? new URL(cover, origin).href : undefined,
      // What GET /api/games/:slug answers. Games are shown as written, in every language.
      data: { url: `/api/games/${gameSlug}`, body: { item: game } },
    }
  }
  const slug = path.match(/^\/events\/([a-z0-9-]+)$/)?.[1]
  const found = slug && (await publishedEvents(env)).items.find((e) => e.slug === slug)
  if (!found) return null
  // In the page's language where the event has a translation.
  const event = localizeEvent(found, locale)
  const url = pageUrl(origin, locale, path)
  const cover = typeof event.cover === 'string' && event.cover
  return {
    locale,
    path,
    title: String(event.title),
    description: String(event.summary),
    image: cover ? new URL(cover, origin).href : undefined,
    ld: eventJsonLd(event, url, origin) ?? undefined,
    // What GET /api/events/:slug?lang= answers.
    data: { url: withLang(`/api/events/${slug}`, locale), body: { item: event } },
  }
}

/**
 * GET /, /events, /games, /events/:slug, /games/:slug and the same under /en,
 * /ja, /ko: the site's page in its language, with the page's own title,
 * description, link preview, links to its other languages and (events)
 * JSON-LD. A zh-TW page without its own (an unknown event, a failed lookup,
 * the upload form) gets the page as it is; one in another language still
 * gets its language.
 */
async function page(request: Request, url: URL, env: Env) {
  const { locale, path } = splitPath(url.pathname)
  let meta: PageMeta | null = null
  try {
    meta = await pageMeta(url.origin, locale, path, env)
  } catch (e) {
    console.error(e)
  }
  if (!meta && locale === DEFAULT_LOCALE) return env.ASSETS.fetch(request)
  // Fetched afresh, without the browser's If-None-Match: a 304 would leave
  // nothing to write into.
  const html = withMeta(await env.ASSETS.fetch(new URL(request.url)), locale, url.origin, meta)
  const res = new Response(html.body, html)
  // The file's tag no longer matches the body.
  res.headers.delete('ETag')
  return res
}

/** Whoever signed the request with a Firebase ID token (bearer), or null. */
async function signedIn(request: Request, env: Env) {
  const token = bearer(request)
  return token ? verifyIdToken(token, env.FIREBASE_AUTH_EMULATOR_HOST) : null
}

// Whether a uid has an admins/{uid} document, remembered per isolate for a
// minute, "no" included: otherwise any signed-in account could spend the
// daily read quota by calling /api/admin/me in a loop. Keyed by verified uid
// only, so made-up tokens cannot grow it. Removing an admin in the console
// takes up to a minute to apply.
const ADMIN_TTL = 60_000
const adminCache = new Map<string, { admin: boolean; at: number }>()

async function isAdmin(db: Firestore, uid: string) {
  const hit = adminCache.get(uid)
  if (hit && Date.now() - hit.at < ADMIN_TTL) return hit.admin
  const admin = (await db.get(`admins/${uid}`)) !== null
  if (adminCache.size > 1000) adminCache.clear()
  adminCache.set(uid, { admin, at: Date.now() })
  return admin
}

// Whether a uid's Discord account is in the server, remembered per isolate
// the same way so a page's few calls ask Discord once. "No" is kept only
// briefly: someone who has just joined presses "check again" right away.
const MEMBER_TTL = 60_000
const NOT_MEMBER_TTL = 10_000
const memberCache = new Map<string, { member: boolean; at: number }>()

async function isMember(env: Env, uid: string) {
  const discordId = uid.match(/^discord:(\d+)$/)?.[1]
  if (!discordId) return false
  const hit = memberCache.get(uid)
  if (hit && Date.now() - hit.at < (hit.member ? MEMBER_TTL : NOT_MEMBER_TTL)) return hit.member
  // With the emulators and a list of test members, the list answers; without
  // the list the bot is asked, as in production.
  const member =
    env.FIREBASE_AUTH_EMULATOR_HOST && env.DEV_DISCORD_MEMBERS !== undefined
      ? env.DEV_DISCORD_MEMBERS.split(',').includes(discordId)
      : await isGuildMember(discordId, env.DISCORD_BOT_TOKEN)
  if (memberCache.size > 1000) memberCache.clear()
  memberCache.set(uid, { member, at: Date.now() })
  return member
}

/** Who may upload games: members of the Discord server, and admins. */
async function canUpload(db: Firestore, env: Env, uid: string) {
  return (await isAdmin(db, uid)) || isMember(env, uid)
}

/** POST …/covers: store the image in the body (worker/src/covers.ts) → { url }. */
async function uploadCover(request: Request, env: Env) {
  const tooLarge = () =>
    json({ error: 'too_large', field: 'cover', code: 'imageTooLarge', message: '圖片不能超過 5 MB' }, 413)
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_COVER_BYTES) return tooLarge()
  const body = await request.arrayBuffer()
  if (body.byteLength > MAX_COVER_BYTES) return tooLarge()
  const url = await saveCover(env.COVERS, body)
  if (!url) throw new Invalid('cover', '只接受 JPEG、PNG、WebP、GIF 或 AVIF 圖片', 'image')
  return json({ url }, 201)
}

/** Create (`exists: false`) or update (`exists: true`) events/{slug} from an admin's form. */
async function saveEvent(db: Firestore, slug: string, body: unknown, exists: boolean) {
  const event = parseEvent(body)
  const res = await db.write(`events/${slug}`, event, {
    mask: savedFields(body),
    now: exists ? ['updatedAt'] : ['createdAt', 'updatedAt'],
    exists,
  })
  if (res.status === 409) return json({ error: 'slug_taken', field: 'slug', message: '這個網址代稱已有活動使用' }, 409)
  if (res.status === 404) return notFound()
  if (!res.ok) throw new Error(`Firestore write failed: ${res.status} ${await res.text()}`)
  publicEvents = null
  const saved = await db.get(`events/${slug}`)
  return json({ item: saved && adminEvent(saved) }, exists ? 200 : 201)
}

/** Set settings/games.pinned to a game's slug, or clear it (null). */
async function setPinned(db: Firestore, slug: string | null) {
  const res = await db.write('settings/games', slug ? { pinned: slug } : {}, { mask: ['pinned'], now: [] })
  if (!res.ok) throw new Error(`Firestore write failed: ${res.status} ${await res.text()}`)
  publicGames = null
}

/**
 * /api/admin/* — for people with a document at admins/{uid} (added by hand
 * in the Firebase console). Requests carry the Firebase ID token as a bearer
 * token.
 *   GET    /me                  → { uid, admin }     (any signed-in user)
 *   POST   /covers              → { url }            an image as the body
 *   GET    /events              → { items }          drafts included
 *   POST   /events              → { item }           create; the slug is in the body
 *   GET    /events/:slug        → { item }
 *   PUT    /events/:slug        → { item }           replace every field (i18n only if sent)
 *   DELETE /events/:slug
 *   GET    /games               → { items, pinned }  hidden ones included
 *   PUT    /games/pinned        → { pinned }         { slug } pins one, { slug: null } none
 *   PUT    /games/:slug/hidden  → { item }           { hidden: true } takes it off the site
 */
async function admin(request: Request, path: string, env: Env) {
  const user = await signedIn(request, env)
  if (!user) return json({ error: 'unauthenticated' }, 401)
  const { uid } = user
  const db = firestore(env)
  const admin = await isAdmin(db, uid)
  const { method } = request

  if (path === '/me' && method === 'GET') return json({ uid, admin }, 200)
  if (!admin) return json({ error: 'forbidden' }, 403)

  if (path === '/covers' && method === 'POST') return uploadCover(request, env)
  if (path === '/games' && method === 'GET') {
    const [docs, settings] = await Promise.all([db.list('games'), db.get('settings/games')])
    return json({ items: docs.map(fullGame).sort(bySaved), pinned: pinnedOf(settings) }, 200)
  }
  if (path === '/games/pinned' && method === 'PUT') {
    const body = await readJson(request)
    const slug = (body as { slug?: unknown } | null)?.slug ?? null
    if (slug !== null) {
      // Only a game people can see can be pinned.
      const doc = typeof slug === 'string' && SLUG.test(slug) ? await db.get(`games/${slug}`) : null
      if (!doc || doc.data.hidden) throw new Invalid('slug', '找不到這款遊戲，或它已被隱藏')
    }
    await setPinned(db, slug as string | null)
    return json({ pinned: slug }, 200)
  }
  const hide = path.match(/^\/games\/([a-z0-9-]+)\/hidden$/)?.[1]
  if (hide && method === 'PUT') {
    const hidden = (await readJson(request) as { hidden?: unknown } | null)?.hidden
    if (typeof hidden !== 'boolean') throw new Invalid('hidden', '格式不正確')
    const res = await db.write(`games/${hide}`, { hidden }, { mask: ['hidden'], now: [], exists: true })
    if (res.status === 404) return notFound()
    if (!res.ok) throw new Error(`Firestore write failed: ${res.status} ${await res.text()}`)
    // A hidden game can't stay pinned.
    if (hidden && pinnedOf(await db.get('settings/games')) === hide) await setPinned(db, null)
    publicGames = null
    const saved = await db.get(`games/${hide}`)
    return json({ item: saved && fullGame(saved) }, 200)
  }
  if (path === '/events' && method === 'GET') {
    return json({ items: (await db.list('events')).map(adminEvent).sort(byStart) }, 200)
  }
  if (path === '/events' && method === 'POST') {
    const body = await readJson(request)
    const slug = (body as { slug?: unknown } | null)?.slug
    if (typeof slug !== 'string' || slug.length > 80 || !SLUG.test(slug)) {
      throw new Invalid('slug', '只能使用小寫英文、數字與連字號（-），最多 80 個字')
    }
    return saveEvent(db, slug, body, false)
  }

  const slug = path.match(/^\/events\/([a-z0-9-]+)$/)?.[1]
  if (!slug) return notFound()
  if (method === 'GET') {
    const doc = await db.get(`events/${slug}`)
    return doc ? json({ item: adminEvent(doc) }, 200) : notFound()
  }
  if (method === 'PUT') return saveEvent(db, slug, await readJson(request), true)
  if (method === 'DELETE') {
    const res = await db.delete(`events/${slug}`)
    if (res.status === 404) return notFound()
    if (!res.ok) throw new Error(`Firestore delete failed: ${res.status} ${await res.text()}`)
    publicEvents = null
    return json({ ok: true }, 200)
  }
  return notFound()
}

/** Create games/{slug} for `owner`, the uploader, or (owner null) update it, from the owner's form. */
async function saveGame(db: Firestore, slug: string, body: unknown, owner: { uid: string; name: string } | null) {
  const game = parseGame(body)
  const res = owner
    ? await db.write(
        `games/${slug}`,
        { ...game, ownerUid: owner.uid, ownerName: owner.name, hidden: false },
        { mask: [...GAME_FIELDS, 'ownerUid', 'ownerName', 'hidden'], now: ['createdAt', 'updatedAt'], exists: false },
      )
    : await db.write(`games/${slug}`, game, { mask: GAME_FIELDS, now: ['updatedAt'], exists: true })
  if (res.status === 409) {
    return json({ error: 'slug_taken', field: 'slug', code: 'slugTaken', message: '這個網址代稱已有遊戲使用' }, 409)
  }
  if (res.status === 404) return notFound()
  if (!res.ok) throw new Error(`Firestore write failed: ${res.status} ${await res.text()}`)
  publicGames = null
  const saved = await db.get(`games/${slug}`)
  return json({ item: saved && fullGame(saved) }, owner ? 201 : 200)
}

/**
 * /api/my/* — a signed-in member's own games. Uploading and editing need
 * membership of the Discord server (checked with Discord each time, cached
 * briefly) or an admin; admins may also edit anyone's game. Requests carry
 * the Firebase ID token as a bearer token.
 *   GET  /status       → { uid, canUpload }   (any signed-in user)
 *   GET  /games        → { items }            the games this account uploaded
 *   POST /covers       → { url }              an image as the body
 *   POST /games        → { item }             create; the slug is in the body
 *   GET  /games/:slug  → { item }
 *   PUT  /games/:slug  → { item }             replace every field an owner edits
 */
async function my(request: Request, path: string, env: Env) {
  const user = await signedIn(request, env)
  if (!user) return json({ error: 'unauthenticated' }, 401)
  const { uid } = user
  const db = firestore(env)
  const { method } = request

  if (path === '/status' && method === 'GET') return json({ uid, canUpload: await canUpload(db, env, uid) }, 200)
  if (path === '/games' && method === 'GET') {
    return json({ items: (await db.list('games', { field: 'ownerUid', value: uid })).map(fullGame).sort(bySaved) }, 200)
  }
  if (!(await canUpload(db, env, uid))) return json({ error: 'not_member' }, 403)

  if (path === '/covers' && method === 'POST') return uploadCover(request, env)
  if (path === '/games' && method === 'POST') {
    const body = await readJson(request)
    const slug = (body as { slug?: unknown } | null)?.slug
    if (typeof slug !== 'string' || slug.length > 60 || !SLUG.test(slug)) {
      throw new Invalid('slug', '只能使用小寫英文、數字與連字號（-），最多 60 個字', 'slug', { max: 60 })
    }
    if (RESERVED_SLUGS.includes(slug)) {
      return json({ error: 'slug_taken', field: 'slug', code: 'slugTaken', message: '這個網址代稱已有遊戲使用' }, 409)
    }
    // Every game is read each time the public list refreshes, so one account can't add without end.
    if (!(await isAdmin(db, uid))) {
      const own = await db.list('games', { field: 'ownerUid', value: uid })
      if (own.length >= MAX_GAMES_PER_MEMBER) return json({ error: 'too_many_games', max: MAX_GAMES_PER_MEMBER }, 409)
    }
    return saveGame(db, slug, body, user)
  }

  const slug = path.match(/^\/games\/([a-z0-9-]+)$/)?.[1]
  if (!slug) return notFound()
  const doc = await db.get(`games/${slug}`)
  // Someone else's game is as good as missing, unless an admin is asking.
  if (!doc || (doc.data.ownerUid !== uid && !(await isAdmin(db, uid)))) return notFound()
  if (method === 'GET') return json({ item: fullGame(doc) }, 200)
  if (method === 'PUT') return saveGame(db, slug, await readJson(request), null)
  return notFound()
}

/** The ?lang= of an events request: the language their text comes in. */
function langParam({ searchParams }: URL): Locale {
  const lang = searchParams.get('lang')
  return LOCALES.find((l) => l === lang) ?? DEFAULT_LOCALE
}

async function route(request: Request, url: URL, env: Env) {
  const { origin, pathname } = url
  const { method } = request
  if (pathname === '/api/auth/discord' && method === 'POST') return discordSignIn(request, env)
  if (pathname.startsWith('/api/admin/')) return admin(request, pathname.slice('/api/admin'.length), env)
  if (pathname.startsWith('/api/my/')) return my(request, pathname.slice('/api/my'.length), env)

  if (method !== 'GET') return notFound()
  if (pathname === '/sitemap.xml') return sitemap(origin, env)
  const cover = pathname.match(COVER_PATH)?.[1]
  if (cover) return (await serveCover(env.COVERS, cover)) ?? notFound()
  if (pathname === '/api/events') {
    const lang = langParam(url)
    return json({ items: (await publishedEvents(env)).items.map((e) => localizeEvent(e, lang)) }, 200)
  }
  const slug = pathname.match(/^\/api\/events\/([a-z0-9-]+)$/)?.[1]
  if (slug) {
    const item = (await publishedEvents(env)).items.find((e) => e.slug === slug)
    return item ? json({ item: localizeEvent(item, langParam(url)) }, 200) : notFound()
  }
  if (pathname === '/api/games') return json({ items: (await listedGames(env)).items }, 200)
  const game = pathname.match(/^\/api\/games\/([a-z0-9-]+)$/)?.[1]
  if (game) {
    const item = (await listedGames(env)).items.find((g) => g.slug === game)
    return item ? json({ item }, 200) : notFound()
  }
  return notFound()
}

// Only /api/*, /sitemap.xml and the pages above (with or without a language
// prefix) reach this script (run_worker_first in wrangler.jsonc); the rest
// of the site is served from the static assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname } = url
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    // Pages are counted apart as well. Over the limit they are still served,
    // only as index.html is: a visitor never gets JSON for a page.
    if (!pathname.startsWith('/api/') && pathname !== '/sitemap.xml') {
      if (request.method !== 'GET' || !(await env.API_LIMIT.limit({ key: `pages:${ip}` })).success) {
        return env.ASSETS.fetch(request)
      }
      return page(request, url, env)
    }
    // Cover images are counted apart (same limit): a page can show several,
    // and they must not use up the allowance for the API itself.
    const key = pathname.startsWith('/api/covers/') ? `covers:${ip}` : ip
    if (!(await env.API_LIMIT.limit({ key })).success) {
      return json({ error: 'rate_limited', message: '請求太頻繁，請稍後再試' }, 429)
    }
    try {
      return await route(request, url, env)
    } catch (e) {
      if (e instanceof Invalid) {
        return json({ error: 'invalid', field: e.field, message: e.message, code: e.code, params: e.params }, 400)
      }
      if (e instanceof MemberCheckUnavailable) {
        console.error(e)
        return json({ error: 'member_check_unavailable' }, 503)
      }
      console.error(e)
      return json({ error: 'server_error' }, 500)
    }
  },
} satisfies ExportedHandler<Env>
