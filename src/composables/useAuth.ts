import { shallowRef, ref, triggerRef } from 'vue'
import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { firebaseApp } from '@/firebase'

// Discord application (Developer Portal → OAuth2). Public; must match
// DISCORD_CLIENT_ID in worker/src/index.ts.
export const DISCORD_CLIENT_ID = '1538119089883455548'

// initializeAuth instead of getAuth: sign-in goes through a custom token, so
// the popup/redirect machinery getAuth bundles is never needed.
const auth = initializeAuth(firebaseApp, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
})

const STATE_KEY = 'gts:discord-oauth'

// Shared across every component: one listener for the whole app. Shallow,
// because Firebase mutates the User in place (see finishDiscordSignIn).
const user = shallowRef<User | null>(null)
const ready = ref(false)
onAuthStateChanged(auth, (u) => {
  user.value = u
  ready.value = true
})

export function discordRedirectUri() {
  return `${location.origin}${import.meta.env.BASE_URL}auth/discord/callback`
}

/** Leave for Discord's consent screen; the callback route finishes sign-in. */
export function signInWithDiscord(returnTo: string) {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, JSON.stringify({ state, returnTo }))
  const url = new URL('https://discord.com/oauth2/authorize')
  url.search = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: 'code',
    redirect_uri: discordRedirectUri(),
    scope: 'identify',
    state,
    // Skip the consent screen for people who already approved the app.
    prompt: 'none',
  }).toString()
  location.assign(url)
}

/** Read and clear the state saved by signInWithDiscord (single use). */
export function takeDiscordState(): { state: string; returnTo: string } | null {
  const raw = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Trade the code Discord sent back for a Firebase session. */
export async function finishDiscordSignIn(code: string) {
  // Served by the Worker in worker/ (proxied to it by the dev server).
  const res = await fetch('/api/auth/discord', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri: discordRedirectUri() }),
  })
  if (!res.ok) throw new Error(`Discord sign-in failed: ${res.status}`)
  const { token, profile } = (await res.json()) as {
    token: string
    profile: { displayName: string; photoURL: string }
  }

  const { user: signedIn } = await signInWithCustomToken(auth, token)
  // Keep the Firebase user's name and avatar in step with Discord.
  if (signedIn.displayName !== profile.displayName || signedIn.photoURL !== profile.photoURL) {
    await updateProfile(signedIn, profile)
    triggerRef(user)
  }
}

/** The signed-in Firebase user, and whether the saved session has been read yet. */
export function useAuth() {
  return { user, ready, signOut: () => firebaseSignOut(auth) }
}
