import { games } from './data/games'
import { buildEvents } from './data/events'

// DEVELOPMENT ONLY. api/client.ts imports this behind `import.meta.env.DEV`,
// so none of the sample content reaches a production build. Locally, when the
// real API has nothing to show (empty list, unknown slug) or can't be reached,
// the page shows sample content instead, marked `sample: true` so it is
// labelled as such.

const samples: Record<string, () => { slug: string }[]> = {
  games: () => games,
  events: () => buildEvents(),
}

export async function withSampleFallback<T>(url: string, real: () => Promise<T>): Promise<T> {
  const [, kind, slug] = url.match(/^\/api\/(games|events)(?:\/([^/?#]+))?(?:\?.*)?$/) ?? []
  const load = kind ? samples[kind] : undefined
  if (!load) return real()

  let failure: unknown
  try {
    const res = await real()
    if (slug || (res as { items?: unknown[] }).items?.length) return res
  } catch (e) {
    failure = e
  }

  if (!slug) {
    console.info(`[dev] ${url}: no real data, showing sample ${kind}`, failure ?? '')
    return { sample: true, items: load() } as T
  }
  const item = load().find((s) => s.slug === slug)
  if (!item) throw failure
  return { sample: true, item } as T
}
