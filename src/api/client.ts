import { ref, watchEffect, toValue, type MaybeRefOrGetter } from 'vue'

export class NotFoundError extends Error {}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (res.status === 404) throw new NotFoundError(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json() as Promise<T>
}

export async function getJson<T>(url: string): Promise<T> {
  // Sample content exists only in development; production builds drop this branch.
  if (import.meta.env.DEV) {
    const { withSampleFallback } = await import('@/mocks/fallback')
    return withSampleFallback(url, () => fetchJson<T>(url))
  }
  return fetchJson<T>(url)
}

/** Fetch JSON from the site API and expose loading / error / retry state. */
export function useApi<T>(url: MaybeRefOrGetter<string>) {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(true)
  let seq = 0

  async function load() {
    const id = ++seq
    loading.value = true
    error.value = null
    try {
      const result = await getJson<T>(toValue(url))
      if (id === seq) data.value = result
    } catch (e) {
      if (id === seq) error.value = e as Error
    } finally {
      if (id === seq) loading.value = false
    }
  }

  watchEffect(() => {
    toValue(url)
    load()
  })

  return { data, error, loading, retry: load }
}
