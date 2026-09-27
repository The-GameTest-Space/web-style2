import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

/**
 * A <details> dropdown in the header: it closes on a press outside it, on
 * Escape (focus back on its toggle) and when the page changes.
 */
export function useDetailsMenu(menu: Ref<HTMLDetailsElement | null>) {
  const route = useRoute()

  function close() {
    if (menu.value) menu.value.open = false
  }
  function onPointerDown(e: PointerEvent) {
    if (menu.value?.open && !menu.value.contains(e.target as Node)) close()
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && menu.value?.open) {
      close()
      menu.value.querySelector('summary')?.focus()
    }
  }
  onMounted(() => {
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('keydown', onKeyDown)
  })
  watch(() => route.fullPath, close)

  return { close }
}
