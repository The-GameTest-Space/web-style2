import { ref, watch } from 'vue'
import { adminApi } from '@/api/admin'
import { useAuth } from './useAuth'

export type AdminStatus = 'checking' | 'signed-out' | 'admin' | 'not-admin' | 'error'

// Shared across every component: the Worker is asked once per signed-in account.
const status = ref<AdminStatus>('checking')
const uid = ref<string | null>(null)
let watching = false

async function check() {
  const { user, ready } = useAuth()
  if (!ready.value) return
  const current = user.value
  uid.value = current?.uid ?? null
  if (!current) {
    status.value = 'signed-out'
    return
  }
  status.value = 'checking'
  try {
    const me = await adminApi.me()
    if (user.value === current) status.value = me.admin ? 'admin' : 'not-admin'
  } catch {
    if (user.value === current) status.value = 'error'
  }
}

/** Whether the signed-in account may use /admin, i.e. has a document at admins/{uid}. */
export function useAdmin() {
  if (!watching) {
    watching = true
    const { user, ready } = useAuth()
    watch([() => user.value?.uid, ready], check, { immediate: true })
  }
  return { status, uid, recheck: check }
}
