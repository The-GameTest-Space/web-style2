// Event cover images, uploaded by admins and kept in Workers KV (binding
// COVERS, namespace event_images). A key is the SHA-256 of the image bytes,
// so one picture uploaded twice is stored once and a URL never changes what
// it shows.

export const MAX_COVER_BYTES = 5 * 1024 * 1024

/** /api/covers/<key>: the path covers are served from, and the only site-local value an event's cover may hold. */
export const COVER_PATH = /^\/api\/covers\/([a-f0-9]{64}\.(?:webp|jpg|png|gif|avif))$/

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n))

// Recognised by their bytes, never by what the request claims. No SVG: it can
// carry script, and these are served from the site's own origin.
const FORMATS: [type: string, ext: string, matches: (b: Uint8Array) => boolean][] = [
  ['image/webp', 'webp', (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP'],
  ['image/jpeg', 'jpg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/png', 'png', (b) => b[0] === 0x89 && ascii(b, 1, 3) === 'PNG'],
  ['image/gif', 'gif', (b) => ascii(b, 0, 4) === 'GIF8'],
  ['image/avif', 'avif', (b) => ascii(b, 4, 8) === 'ftypavif'],
]

/** Store an image and return its /api/covers URL, or null when the bytes are not a supported image. */
export async function saveCover(kv: KVNamespace, body: ArrayBuffer): Promise<string | null> {
  const bytes = new Uint8Array(body)
  const format = FORMATS.find(([, , matches]) => matches(bytes))
  if (!format) return null
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const key = `${[...digest].map((b) => b.toString(16).padStart(2, '0')).join('')}.${format[1]}`
  await kv.put(key, body, { metadata: { type: format[0] } })
  return `/api/covers/${key}`
}

export async function serveCover(kv: KVNamespace, key: string): Promise<Response | null> {
  const { value, metadata } = await kv.getWithMetadata<{ type: string }>(key, 'arrayBuffer')
  if (!value || !metadata) return null
  return new Response(value, {
    headers: {
      'Content-Type': metadata.type,
      // The key is the content's hash, so a cached copy never goes stale.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      // Opened directly, the response still runs nothing.
      'Content-Security-Policy': "default-src 'none'",
    },
  })
}
