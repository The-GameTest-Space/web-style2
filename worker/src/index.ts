import { bearer, verifyIdToken } from './auth'
import { COVER_PATH, MAX_COVER_BYTES, saveCover, serveCover } from './covers'
import { EVENT_FIELDS, Invalid, SLUG, adminEvent, byStart, parseEvent, publicEvent } from './events'
import { Firestore, saveUser } from './firestore'
import { createCustomToken, type ServiceAccount } from './token'

interface Env {
  DISCORD_CLIENT_SECRET: string
  FIREBASE_SERVICE_ACCOUNT: string
  // Per-IP request limit for /api/* (ratelimits in wrangler.jsonc).
  API_LIMIT: RateLimit
  // Event cover images (worker/src/covers.ts), KV namespace event_images.
  COVERS: KVNamespace
  // Local development only (.dev.vars): use the Firebase emulators, e.g.
  // localhost:8085 and localhost:9099. See README.
  FIRESTORE_EMULATOR_HOST?: string
  FIREBASE_AUTH_EMULATOR_HOST?: string
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

// Pages with content of their own. Games have no store yet: add /games and
// /games/:slug once they do.
const SITEMAP_PAGES = ['/', '/events']

/** GET /sitemap.xml: the fixed pages plus every published event, for search engines. */
async function sitemap(origin: string, env: Env) {
  const { items, updated } = await publishedEvents(env)
  const urls = [
    ...SITEMAP_PAGES.map((path) => `<url><loc>${origin}${path}</loc></url>`),
    ...items.map(({ slug }) => {
      const lastmod = updated.get(String(slug))
      return `<url><loc>${origin}/events/${slug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
    }),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
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

/** Create (`exists: false`) or update (`exists: true`) events/{slug} from an admin's form. */
async function saveEvent(db: Firestore, slug: string, body: unknown, exists: boolean) {
  const event = parseEvent(body)
  const res = await db.write(`events/${slug}`, event, {
    mask: EVENT_FIELDS,
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

/**
 * /api/admin/* — for people with a document at admins/{uid} (added by hand
 * in the Firebase console). Requests carry the Firebase ID token as a bearer
 * token.
 *   GET    /me              → { uid, admin }  (any signed-in user)
 *   GET    /events          → { items }       drafts included
 *   POST   /events          → { item }        create; the slug is in the body
 *   GET    /events/:slug    → { item }
 *   PUT    /events/:slug    → { item }        replace every field
 *   DELETE /events/:slug
 */
async function admin(request: Request, path: string, env: Env) {
  const token = bearer(request)
  const uid = token && (await verifyIdToken(token, env.FIREBASE_AUTH_EMULATOR_HOST))
  if (!uid) return json({ error: 'unauthenticated' }, 401)
  const db = firestore(env)
  const admin = await isAdmin(db, uid)
  const { method } = request

  if (path === '/me' && method === 'GET') return json({ uid, admin }, 200)
  if (!admin) return json({ error: 'forbidden' }, 403)

  if (path === '/covers' && method === 'POST') {
    const tooLarge = () => json({ error: 'too_large', field: 'cover', message: '圖片不能超過 5 MB' }, 413)
    if (Number(request.headers.get('Content-Length') ?? 0) > MAX_COVER_BYTES) return tooLarge()
    const body = await request.arrayBuffer()
    if (body.byteLength > MAX_COVER_BYTES) return tooLarge()
    const url = await saveCover(env.COVERS, body)
    if (!url) throw new Invalid('cover', '只接受 JPEG、PNG、WebP、GIF 或 AVIF 圖片')
    return json({ url }, 201)
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

async function route(request: Request, { origin, pathname }: URL, env: Env) {
  const { method } = request
  if (pathname === '/api/auth/discord' && method === 'POST') return discordSignIn(request, env)
  if (pathname.startsWith('/api/admin/')) return admin(request, pathname.slice('/api/admin'.length), env)

  if (method !== 'GET') return notFound()
  if (pathname === '/sitemap.xml') return sitemap(origin, env)
  const cover = pathname.match(COVER_PATH)?.[1]
  if (cover) return (await serveCover(env.COVERS, cover)) ?? notFound()
  if (pathname === '/api/events') return json({ items: (await publishedEvents(env)).items }, 200)
  const slug = pathname.match(/^\/api\/events\/([a-z0-9-]+)$/)?.[1]
  if (slug) {
    const item = (await publishedEvents(env)).items.find((e) => e.slug === slug)
    return item ? json({ item }, 200) : notFound()
  }
  // Games have no store yet; the list is empty until they do.
  if (pathname === '/api/games') return json({ items: [] }, 200)
  return notFound()
}

// Only /api/* and /sitemap.xml reach this script (run_worker_first in
// wrangler.jsonc); the site itself is served from the static assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname } = url
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    // Cover images are counted apart (same limit): a page can show several,
    // and they must not use up the allowance for the API itself.
    const key = pathname.startsWith('/api/covers/') ? `covers:${ip}` : ip
    if (!(await env.API_LIMIT.limit({ key })).success) {
      return json({ error: 'rate_limited', message: '請求太頻繁，請稍後再試' }, 429)
    }
    try {
      return await route(request, url, env)
    } catch (e) {
      if (e instanceof Invalid) return json({ error: 'invalid', field: e.field, message: e.message }, 400)
      console.error(e)
      return json({ error: 'server_error' }, 500)
    }
  },
} satisfies ExportedHandler<Env>
