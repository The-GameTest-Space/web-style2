import { useAuth } from '@/composables/useAuth'

/**
 * A failed call to the Worker. `field` names the rejected form field when the
 * Worker says which; `code` and `params` say why, for a message in the page's
 * language (form.error.*). `message` is the Worker's zh-TW text.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
    readonly field?: string,
    readonly params: Record<string, number> = {},
  ) {
    super(message ?? code)
  }
}

/**
 * A call to the Worker (worker/src/index.ts), signed with the Firebase ID
 * token of whoever is signed in. A Blob body (an image) is sent as is;
 * anything else as JSON. For an invalid field, the ApiError's code is the
 * reason (required, tooLong…); otherwise it is the Worker's error.
 */
export async function signedCall<T>(method: string, url: string, body?: unknown): Promise<T> {
  const token = await useAuth().user.value?.getIdToken()
  if (!token) throw new ApiError(401, 'unauthenticated')
  const raw = body instanceof Blob
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': raw ? body.type : 'application/json' }),
    },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(res.status, data.code ?? data.error ?? 'server_error', data.message, data.field, {
      ...data.params,
      ...(typeof data.max === 'number' && { max: data.max }),
    })
  }
  return data as T
}
