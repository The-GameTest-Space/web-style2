// The web app's API key (public, same as src/firebase.ts). Identity Toolkit
// wants one on every call; it identifies the project, it grants nothing.
const FIREBASE_API_KEY = 'AIzaSyDNfnA32pCj7QI3dHXROJ57VcNkXjJBvOk'

/**
 * The uid a Firebase ID token belongs to, or null when the token is invalid,
 * expired or its account is disabled. Google checks the token (accounts:lookup),
 * so there are no signing keys to fetch and rotate here. `emulatorHost` points
 * at the local Auth emulator instead.
 */
export async function verifyIdToken(idToken: string, emulatorHost?: string): Promise<string | null> {
  const base = emulatorHost ? `http://${emulatorHost}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com'
  const res = await fetch(`${base}/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  // INVALID_ID_TOKEN, TOKEN_EXPIRED, USER_NOT_FOUND …
  if (res.status === 400) return null
  if (!res.ok) throw new Error(`Identity Toolkit lookup failed: ${res.status} ${await res.text()}`)
  const { users } = (await res.json()) as { users?: { localId: string; disabled?: boolean }[] }
  const user = users?.[0]
  return user && !user.disabled ? user.localId : null
}

/** The bearer token from an Authorization header. */
export const bearer = (request: Request) => request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1] ?? null
