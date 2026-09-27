import { saveUser } from './firestore'
import { createCustomToken, type ServiceAccount } from './token'

interface Env {
  DISCORD_CLIENT_SECRET: string
  FIREBASE_SERVICE_ACCOUNT: string
}

// Public; must match DISCORD_CLIENT_ID in src/composables/useAuth.ts.
const DISCORD_CLIENT_ID = '1538119089883455548'
const DISCORD_API = 'https://discord.com/api/v10'

// The callback URLs registered on the Discord app. Their origins are the only
// sites allowed to call this worker.
const REDIRECT_URIS = [
  'http://localhost:5199/auth/discord/callback',
  'https://the-gametest-space.github.io/web-style2/auth/discord/callback',
]
const ORIGINS = new Set(REDIRECT_URIS.map((uri) => new URL(uri).origin))

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

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ORIGINS.has(origin)) return { Vary: 'Origin' }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

/**
 * POST /discord { code, redirectUri } → { token, profile }
 * Trades a Discord OAuth2 authorization code for a Firebase custom token for
 * uid `discord:<id>`, plus the Discord name and avatar for the user record,
 * and saves the user to Firestore at users/{uid}.
 */
async function discordSignIn(request: Request, env: Env, headers: Record<string, string>) {
  const { code, redirectUri } = await request
    .json<{ code?: unknown; redirectUri?: unknown }>()
    .catch(() => ({}) as { code?: unknown; redirectUri?: unknown })
  if (typeof code !== 'string' || typeof redirectUri !== 'string' || !REDIRECT_URIS.includes(redirectUri)) {
    return json({ error: 'invalid_request' }, 400, headers)
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
    return json({ error: 'invalid_grant' }, 401, headers)
  }
  const { access_token } = await tokenRes.json<{ access_token: string }>()

  const meRes = await fetch(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${access_token}` } })
  if (!meRes.ok) {
    console.warn('Discord profile fetch failed', meRes.status)
    return json({ error: 'discord_unavailable' }, 502, headers)
  }
  const me = await meRes.json<DiscordUser>()

  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount
  const uid = `discord:${me.id}`
  const displayName = me.global_name ?? me.username
  const photoURL = avatarUrl(me)
  // Record the user before handing out the token; a failure fails the sign-in
  // so no one ends up signed in without a users/{uid} document.
  await saveUser(account, uid, { discordId: me.id, username: me.username, displayName, photoURL })
  const token = await createCustomToken(account, uid)
  return json({ token, profile: { displayName, photoURL } }, 200, headers)
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request.headers.get('Origin'))
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/discord') {
      return json({ error: 'not_found' }, 404, headers)
    }
    try {
      return await discordSignIn(request, env, headers)
    } catch (e) {
      // An uncaught throw becomes a bare 500 without CORS headers, which the
      // browser reports as a CORS failure and hides the real cause.
      console.error(e)
      return json({ error: 'server_error' }, 500, headers)
    }
  },
} satisfies ExportedHandler<Env>
