import { effectScope, ref, watch } from 'vue'
import { myApi } from '@/api/my'
import { ApiError } from '@/api/signed'
import { useAuth } from './useAuth'

/**
 * `member`: may upload games (in the Discord server, or an admin).
 * `unavailable`: the Worker can't ask Discord (no bot token set).
 */
export type MemberStatus = 'checking' | 'signed-out' | 'member' | 'not-member' | 'unavailable' | 'error'

// Shared across every component: the Worker is asked once per signed-in
// account, and again when someone who just joined the server asks it to.
const status = ref<MemberStatus>('checking')
let watching = false

async function check() {
  const { user, ready } = useAuth()
  if (!ready.value) return
  const current = user.value
  if (!current) {
    status.value = 'signed-out'
    return
  }
  status.value = 'checking'
  try {
    const me = await myApi.status()
    if (user.value === current) status.value = me.canUpload ? 'member' : 'not-member'
  } catch (e) {
    if (user.value === current) status.value = e instanceof ApiError && e.status === 503 ? 'unavailable' : 'error'
  }
}

/** Whether the signed-in account may upload games: a member of the Discord server, or an admin. */
export function useMember() {
  if (!watching) {
    watching = true
    const { user, ready } = useAuth()
    // In a scope of its own: the page that first asks goes away when people
    // move on, and a watcher made in its setup would stop with it.
    effectScope(true).run(() => watch([() => user.value?.uid, ready], check, { immediate: true }))
  }
  return { status, recheck: check }
}
