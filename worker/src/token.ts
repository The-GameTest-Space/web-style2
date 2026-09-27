export interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

function base64url(bytes: Uint8Array) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const encodeJson = (value: unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)))

function importPrivateKey(pem: string) {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
}

/** An RS256 JWT issued by the service account, valid for one hour. */
async function signJwt(account: ServiceAccount, claims: Record<string, unknown>) {
  const iat = Math.floor(Date.now() / 1000)
  const unsigned = `${encodeJson({ alg: 'RS256', typ: 'JWT' })}.${encodeJson({
    iss: account.client_email,
    iat,
    exp: iat + 3600,
    ...claims,
  })}`
  const key = await importPrivateKey(account.private_key)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  return `${unsigned}.${base64url(new Uint8Array(signature))}`
}

/**
 * A Firebase custom token, signed the way the Admin SDK's createCustomToken
 * does. The client trades it in with signInWithCustomToken; Firebase creates
 * the user on first sign-in.
 */
export function createCustomToken(account: ServiceAccount, uid: string) {
  return signJwt(account, {
    sub: account.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    uid,
  })
}

// Isolates are reused across requests, so one token serves many sign-ins.
let cached: { token: string; expires: number } | null = null

/** An OAuth access token for Google APIs (Firestore), via the JWT bearer grant. */
export async function getAccessToken(account: ServiceAccount) {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await signJwt(account, {
        scope: 'https://www.googleapis.com/auth/datastore',
        aud: 'https://oauth2.googleapis.com/token',
      }),
    }),
  })
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`)
  const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: access_token, expires: Date.now() + expires_in * 1000 }
  return access_token
}
