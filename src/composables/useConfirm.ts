import { shallowReadonly, shallowRef } from 'vue'

/** A question for the site's confirm dialog (ConfirmDialog.vue, in App.vue). */
export interface ConfirmQuestion {
  /** The question itself: 要刪除「…」嗎？ */
  title: string
  /** What happens if they go ahead. */
  message?: string
  /** Names the action (刪除活動), not a bare OK. */
  confirmLabel: string
  cancelLabel: string
}

const open = shallowRef<(ConfirmQuestion & { resolve: (ok: boolean) => void }) | null>(null)

/** The question the dialog shows, if any. */
export const confirmQuestion = shallowReadonly(open)

/**
 * Ask before an action, in the site's own dialog rather than window.confirm().
 * Resolves true when confirmed. A new question (the back button pressed while
 * a leave-the-page question is open) answers the open one with no.
 */
export function askConfirm(question: ConfirmQuestion): Promise<boolean> {
  open.value?.resolve(false)
  return new Promise((resolve) => {
    open.value = { ...question, resolve }
  })
}

/** Answer the open question; does nothing when none is open. */
export function answerConfirm(ok: boolean) {
  const q = open.value
  if (!q) return
  open.value = null
  q.resolve(ok)
}
