import { delay, http, HttpResponse } from 'msw'
import { games } from './data/games'
import { buildEvents } from './data/events'
import type { Game } from '@/api/types'

// Asset paths honour Vite's base so covers resolve on a sub-path host (GitHub Pages).
const withBase = (g: Game): Game => ({ ...g, cover: import.meta.env.BASE_URL + g.cover.replace(/^\//, '') })

// Every mock response carries `sample: true` so the UI can label it honestly.
export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ status: 'ok' })),

  http.get('/api/games', async () => {
    await delay(250)
    return HttpResponse.json({ sample: true, items: games.map(withBase) })
  }),

  http.get('/api/games/:slug', async ({ params }) => {
    await delay(200)
    const item = games.find((g) => g.slug === params.slug)
    if (!item) return HttpResponse.json({ message: 'not found' }, { status: 404 })
    return HttpResponse.json({ sample: true, item: withBase(item) })
  }),

  http.get('/api/events', async () => {
    await delay(250)
    return HttpResponse.json({ sample: true, items: buildEvents() })
  }),

  http.get('/api/events/:slug', async ({ params }) => {
    await delay(200)
    const item = buildEvents().find((e) => e.slug === params.slug)
    if (!item) return HttpResponse.json({ message: 'not found' }, { status: 404 })
    return HttpResponse.json({ sample: true, item })
  }),
]
