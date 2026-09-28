import type { AdminEvent, EventInput, ItemResponse, ListResponse, OwnGame } from './types'
import { signedCall } from './signed'

// /api/admin/* on the Worker (worker/src/index.ts).
const call = <T>(method: string, path: string, body?: unknown) => signedCall<T>(method, `/api/admin${path}`, body)

export const adminApi = {
  me: () => call<{ uid: string; admin: boolean }>('GET', '/me'),
  events: () => call<ListResponse<AdminEvent>>('GET', '/events'),
  event: (slug: string) => call<ItemResponse<AdminEvent>>('GET', `/events/${slug}`),
  create: (event: EventInput) => call<ItemResponse<AdminEvent>>('POST', '/events', event),
  update: (event: EventInput) => call<ItemResponse<AdminEvent>>('PUT', `/events/${event.slug}`, event),
  remove: (slug: string) => call<{ ok: true }>('DELETE', `/events/${slug}`),
  uploadCover: (image: Blob) => call<{ url: string }>('POST', '/covers', image),
  games: () => call<ListResponse<OwnGame> & { pinned: string | null }>('GET', '/games'),
  pinGame: (slug: string | null) => call<{ pinned: string | null }>('PUT', '/games/pinned', { slug }),
  hideGame: (slug: string, hidden: boolean) => call<ItemResponse<OwnGame>>('PUT', `/games/${slug}/hidden`, { hidden }),
}
