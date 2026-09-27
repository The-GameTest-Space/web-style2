import { ref } from 'vue'

const KEY = 'gts:intro-seen'

function readSeen() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* storage unavailable: the intro may play again next visit, which is fine */
  }
}

/**
 * Decided before the app mounts so the home page never flashes first.
 * Plays once per browser session, only when the visit starts on the home
 * page, never under reduced motion. `?intro` forces a replay.
 */
function decide() {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const path = window.location.pathname.replace(base, '') || '/'
  if (path !== '/') return false
  if (params.has('intro')) return true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return !readSeen()
}

const playing = ref(decide())
if (playing.value) document.documentElement.classList.add('intro-active')

export function useIntro() {
  function finish() {
    if (!playing.value) return
    playing.value = false
    markSeen()
    const html = document.documentElement
    html.classList.remove('intro-active')
    html.classList.add('intro-played')
  }
  return { playing, finish }
}
