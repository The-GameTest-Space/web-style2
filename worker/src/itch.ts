// itch.io game pages. The widget itch.io offers for embedding
// (itch.io/embed/<id>) needs the game's number, which its page's URL
// doesn't carry; the page's data.json does.

import { Invalid } from './validate'

const PAGE = /^https:\/\/[a-z0-9][a-z0-9-]*\.itch\.io\/[a-z0-9][a-z0-9_-]*$/

const unreachable = () => new Invalid('itch', '目前無法連線到 itch.io，請稍後再試', 'itchUnavailable')
const notFound = () => new Invalid('itch', '找不到這個 itch.io 遊戲頁', 'itch')

/**
 * The game at an itch.io page (https://<creator>.itch.io/<game>): its page,
 * after any rename of its creator, and its number. Rejects a page itch.io
 * doesn't know.
 */
export async function itchGame(page: string): Promise<{ itchUrl: string; itchId: string }> {
  let res: Response
  try {
    res = await fetch(`${page}/data.json`, { signal: AbortSignal.timeout(5000) })
  } catch {
    throw unreachable()
  }
  // {"errors":["invalid game"]}
  if (res.status === 404) throw notFound()
  if (!res.ok) throw unreachable()
  const { id } = (await res.json().catch(() => ({}))) as { id?: unknown }
  // A renamed creator's pages redirect to the new name.
  const itchUrl = res.url.replace(/\/data\.json$/, '')
  if (typeof id !== 'number' || !PAGE.test(itchUrl)) throw notFound()
  return { itchUrl, itchId: String(id) }
}
