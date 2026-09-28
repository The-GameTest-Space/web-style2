import { getAccessToken, type ServiceAccount } from './token'

// Firestore through its REST API, as the service account (which bypasses the
// security rules). Documents are always named in the request body (:commit,
// :batchGet, :runQuery), never in the URL, so IDs like `discord:123` need no
// escaping.

type Value =
  | { nullValue: null }
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { arrayValue: { values?: Value[] } }
  | { mapValue: { fields?: Fields } }
export type Fields = Record<string, Value>

/** Plain data to Firestore values. Dates become timestamps; undefined fields are left out. */
export function encodeFields(data: object): Fields {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, encode(v)]),
  )
}

function encode(v: unknown): Value {
  if (v === null) return { nullValue: null }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } }
  if (typeof v === 'object') return { mapValue: { fields: encodeFields(v) } }
  throw new TypeError(`Cannot store a ${typeof v} in Firestore`)
}

/** Firestore values to plain data. Timestamps become ISO strings. */
export function decodeFields(fields: Fields = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]))
}

function decode(v: Value): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('timestampValue' in v) return new Date(v.timestampValue).toISOString()
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode)
  if ('mapValue' in v) return decodeFields(v.mapValue.fields)
  return null
}

export interface Doc {
  id: string
  data: Record<string, unknown>
}

interface RawDoc {
  name: string
  fields?: Fields
}

const toDoc = (d: RawDoc): Doc => ({ id: d.name.slice(d.name.lastIndexOf('/') + 1), data: decodeFields(d.fields) })

export class Firestore {
  readonly database: string
  private readonly base: string

  /** `emulatorHost` (e.g. localhost:8085) points at the local emulator instead of Google. */
  constructor(
    private readonly account: ServiceAccount,
    private readonly emulatorHost?: string,
  ) {
    this.database = `projects/${account.project_id}/databases/(default)`
    this.base = emulatorHost ? `http://${emulatorHost}/v1` : 'https://firestore.googleapis.com/v1'
  }

  /** POST to documents:<method>. Resolves to the raw response so callers can read precondition failures. */
  async call(method: 'commit' | 'batchGet' | 'runQuery', body: unknown) {
    // The emulator treats "owner" as an admin credential.
    const token = this.emulatorHost ? 'owner' : await getAccessToken(this.account)
    return fetch(`${this.base}/${this.database}/documents:${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  name(path: string) {
    return `${this.database}/documents/${path}`
  }

  async get(path: string): Promise<Doc | null> {
    const res = await this.call('batchGet', { documents: [this.name(path)] })
    if (!res.ok) throw new Error(`Firestore read failed: ${res.status} ${await res.text()}`)
    const [result] = (await res.json()) as { found?: RawDoc }[]
    return result?.found ? toDoc(result.found) : null
  }

  /** Every document in a collection, optionally only those where `field` equals `value`. */
  async list(collection: string, where?: { field: string; value: string | boolean }): Promise<Doc[]> {
    const res = await this.call('runQuery', {
      structuredQuery: {
        from: [{ collectionId: collection }],
        ...(where && {
          where: {
            fieldFilter: { field: { fieldPath: where.field }, op: 'EQUAL', value: encode(where.value) },
          },
        }),
      },
    })
    if (!res.ok) throw new Error(`Firestore query failed: ${res.status} ${await res.text()}`)
    const rows = (await res.json()) as { document?: RawDoc }[]
    return rows.flatMap((r) => (r.document ? [toDoc(r.document)] : []))
  }

  /**
   * Write the fields named in `mask` (a masked field missing from `data` is
   * deleted) and stamp `now` with the server time. `exists` is a
   * precondition: true fails with 404 if the document is missing, false
   * fails with 409 if it is already there. Without it the document is
   * created or updated, whichever applies.
   */
  write(path: string, data: object, opts: { mask: string[]; now: string[]; exists?: boolean }) {
    return this.call('commit', {
      writes: [
        {
          update: { name: this.name(path), fields: encodeFields(data) },
          updateMask: { fieldPaths: opts.mask },
          updateTransforms: opts.now.map((fieldPath) => ({ fieldPath, setToServerValue: 'REQUEST_TIME' })),
          ...(opts.exists !== undefined && { currentDocument: { exists: opts.exists } }),
        },
      ],
    })
  }

  /** Delete a document; fails with 404 if it is not there. */
  delete(path: string) {
    return this.call('commit', { writes: [{ delete: this.name(path), currentDocument: { exists: true } }] })
  }
}

export interface UserProfile {
  discordId: string
  username: string
  displayName: string
  photoURL: string
}

/**
 * Upsert users/{uid}. Profile fields are refreshed on every sign-in;
 * lastLoginAt is the server time of this one and createdAt the server time
 * of the first.
 */
export async function saveUser(db: Firestore, uid: string, profile: UserProfile) {
  // The precondition decides createdAt: an update must find the document, a
  // create must not. Returning users are the common case, so try that first.
  const commit = (exists: boolean) =>
    db.write(`users/${uid}`, profile, {
      mask: Object.keys(profile),
      now: exists ? ['lastLoginAt'] : ['lastLoginAt', 'createdAt'],
      exists,
    })

  let res = await commit(true)
  if (res.status === 404) res = await commit(false)
  // Two first sign-ins raced and the other one created it.
  if (res.status === 409) res = await commit(true)
  if (!res.ok) throw new Error(`Firestore write failed: ${res.status} ${await res.text()}`)
}
