<script setup lang="ts">
// A row of filter chips as one dropdown, for screens too narrow to show them
// all. The pill reads like a chip: inverted once it holds anything but the
// first ("all") option. The list opens on a card like the header's menus,
// the chosen option marked with the logo's orange dot.
import { computed, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import Viewfinder from './Viewfinder.vue'
import { useDetailsMenu } from '@/composables/useDetailsMenu'

type Option = { value: string; label: string; lang?: string }
const props = defineProps<{ label: string; options: Option[] }>()
const model = defineModel<string>({ required: true })

const menu = ref<HTMLDetailsElement | null>(null)
const { close } = useDetailsMenu(menu)

// Until the options arrive (from the API), the value may name none of them.
const current = computed(() => props.options.find((o) => o.value === model.value) ?? props.options[0])

function choose(value: string) {
  model.value = value
  close()
  menu.value?.querySelector('summary')?.focus()
}

// Up and down move through the options, opening the list from the pill.
function onArrow(e: KeyboardEvent) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  const el = menu.value
  if (!el) return
  e.preventDefault()
  const items = [...el.querySelectorAll<HTMLElement>('.pick__option')]
  if (!el.open) {
    el.open = true
    ;(items.find((b) => b.getAttribute('aria-pressed') === 'true') ?? items[0])?.focus()
    return
  }
  const i = items.indexOf(document.activeElement as HTMLElement)
  const step = e.key === 'ArrowDown' ? 1 : -1
  items[i < 0 ? 0 : (i + step + items.length) % items.length]?.focus()
}
</script>

<template>
  <details ref="menu" class="pick" :class="{ 'is-set': current && current.value !== options[0]?.value }" @keydown="onArrow">
    <summary class="pick__toggle">
      <span class="visually-hidden">{{ label }}</span>
      <span class="pick__value" :lang="current?.lang">{{ current?.label }}</span>
      <ChevronDown class="pick__icon" :size="18" aria-hidden="true" />
    </summary>
    <div class="pick__panel vf-target is-active">
      <Viewfinder />
      <ul class="pick__list">
        <li v-for="o in options" :key="o.value">
          <button
            type="button"
            class="pick__option"
            :aria-pressed="o.value === current?.value"
            :lang="o.lang"
            @click="choose(o.value)"
          >
            <span class="pick__dot" aria-hidden="true"></span>
            <span class="pick__name">{{ o.label }}</span>
          </button>
        </li>
      </ul>
    </div>
  </details>
</template>

<style scoped>
.pick {
  position: relative;
  min-width: 0;
}
.pick__toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px 0 16px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--ink);
  list-style: none;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
}
.pick__toggle::-webkit-details-marker {
  display: none;
}
.pick__toggle:hover,
.pick[open] > .pick__toggle {
  background: var(--card);
}
.pick.is-set > .pick__toggle {
  background: var(--ink);
  color: var(--card);
}
.pick__toggle:focus-visible {
  border-radius: 999px;
}
.pick__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pick__icon {
  flex: none;
  transition: transform 0.35s var(--ease-out);
}
.pick[open] .pick__icon {
  transform: rotate(180deg);
}

/* The logo's frame, locking on as the list opens. */
.pick__panel {
  --vf-inset: -9px;
  --vf-size: 20px;
  --vf-w: 3px;
  position: absolute;
  top: calc(100% + 16px);
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--card);
  box-shadow: var(--shadow-lift);
  transform: rotate(-1deg);
  transform-origin: top left;
}
.pick__panel :deep(.vf) {
  transition:
    transform 0.45s var(--ease-out),
    opacity 0.2s;
}
@starting-style {
  .pick[open] .pick__panel :deep(.vf) {
    transform: scale(1.12);
    opacity: 0;
  }
}
/* A long list (the games' genres) scrolls inside the card. */
.pick__list {
  max-height: min(56vh, 420px);
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0;
  padding: 6px 20px;
  list-style: none;
}
.pick__option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 700;
  color: var(--ink);
  text-align: start;
  cursor: pointer;
}
.pick__dot {
  flex: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ink);
  transition:
    background-color 0.25s,
    transform 0.35s var(--ease-slap);
}
.pick__option[aria-pressed='true'] {
  font-weight: 900;
}
.pick__option[aria-pressed='true'] .pick__dot {
  background: var(--dot);
  transform: scale(1.08);
}
.pick__option:active .pick__dot {
  transform: scale(0.9);
}
.pick__option:hover .pick__name,
.pick__option:focus-visible .pick__name {
  text-decoration: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 3px;
  text-underline-offset: 3px;
}
.pick__option:focus-visible {
  outline: none;
}
.pick__option:focus-visible .pick__dot {
  outline: 3px solid var(--ink);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .pick__icon,
  .pick__dot,
  .pick__panel :deep(.vf) {
    transition: none;
  }
}
</style>
