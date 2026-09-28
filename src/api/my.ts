import type { GameInput, ItemResponse, ListResponse, OwnGame } from './types'
import { signedCall } from './signed'

// /api/my/* on the Worker (worker/src/index.ts): a member's own games.
const call = <T>(method: string, path: string, body?: unknown) => signedCall<T>(method, `/api/my${path}`, body)

export const myApi = {
  status: () => call<{ uid: string; canUpload: boolean }>('GET', '/status'),
  games: () => call<ListResponse<OwnGame>>('GET', '/games'),
  game: (slug: string) => call<ItemResponse<OwnGame>>('GET', `/games/${slug}`),
  create: (game: GameInput) => call<ItemResponse<OwnGame>>('POST', '/games', game),
  update: (game: GameInput) => call<ItemResponse<OwnGame>>('PUT', `/games/${game.slug}`, game),
  uploadCover: (image: Blob) => call<{ url: string }>('POST', '/covers', image),
}
