import type { AdminEvent, EventInput, ItemResponse, ListResponse } from './types'
import { useAuth } from '@/composables/useAuth'

/** A failed admin call. `field` names the rejected form field when the Worker says which. */
export class AdminError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
    readonly field?: string,
  ) {
    super(message ?? code)
  }
}

// /api/admin/* on the Worker (worker/src/index.ts), signed with the
// Firebase ID token of whoever is signed in.
async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await useAuth().user.value?.getIdToken()
  if (!token) throw new AdminError(401, 'unauthenticated')
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new AdminError(res.status, data.error ?? 'server_error', data.message, data.field)
  return data as T
}

export const adminApi = {
  me: () => call<{ uid: string; admin: boolean }>('GET', '/me'),
  events: () => call<ListResponse<AdminEvent>>('GET', '/events'),
  event: (slug: string) => call<ItemResponse<AdminEvent>>('GET', `/events/${slug}`),
  create: (event: EventInput) => call<ItemResponse<AdminEvent>>('POST', '/events', event),
  update: (event: EventInput) => call<ItemResponse<AdminEvent>>('PUT', `/events/${event.slug}`, event),
  remove: (slug: string) => call<{ ok: true }>('DELETE', `/events/${slug}`),
}
