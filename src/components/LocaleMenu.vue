<script setup lang="ts">
// The same page in another language. Plain links, not router links: each
// language has its own URL prefix, and search engines follow these too.
//
// Built on the logo: its four dots are the four languages (LOCALES order:
// top, left, right, bottom) and the orange one is the page's language. The
// panel lays them out as the logo does, like a controller's face buttons;
// pointing at one moves the orange dot there, and the arrow keys move
// between them.
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import LocaleMark from './LocaleMark.vue'
import Viewfinder from './Viewfinder.vue'
import { useDetailsMenu } from '@/composables/useDetailsMenu'
import { locale, t } from '@/i18n'
import { LOCALES, LOCALE_INFO, localePath } from '@/i18n/locales'

const POSITIONS = ['top', 'left', 'right', 'bottom'] as const
const ARROWS: Record<string, number> = { ArrowUp: 0, ArrowLeft: 1, ArrowRight: 2, ArrowDown: 3 }

const route = useRoute()
const menu = ref<HTMLDetailsElement | null>(null)
useDetailsMenu(menu)

const current = LOCALES.indexOf(locale)
const pointed = ref<number | null>(null)
const lit = computed(() => pointed.value ?? current)

function onArrow(e: KeyboardEvent) {
  const i = ARROWS[e.key]
  if (i === undefined) return
  e.preventDefault()
  menu.value?.querySelectorAll<HTMLElement>('.lang__key')[i]?.focus()
}
</script>

<template>
  <details ref="menu" class="lang">
    <summary class="lang__toggle vf-target">
      <Viewfinder />
      <LocaleMark :active="lit" :size="22" />
      <span class="lang__short" aria-hidden="true">{{ LOCALE_INFO[locale].short }}</span>
      <span class="visually-hidden">{{ t('lang.current', { name: LOCALE_INFO[locale].name }) }}</span>
    </summary>
    <div class="lang__panel vf-target is-active">
      <Viewfinder />
      <ul class="lang__pad" @keydown="onArrow" @pointerleave="pointed = null">
        <li v-for="(l, i) in LOCALES" :key="l" class="lang__slot" :class="`lang__slot--${POSITIONS[i]}`">
          <a
            :href="localePath(l, route.fullPath)"
            :hreflang="LOCALE_INFO[l].hreflang"
            :lang="LOCALE_INFO[l].htmlLang"
            class="lang__key"
            :class="{ 'is-lit': i === lit }"
            :aria-current="i === current ? 'true' : undefined"
            @pointerenter="pointed = i"
            @focus="pointed = i"
            @blur="pointed = null"
          >
            <span class="lang__dot" aria-hidden="true"></span>
            <span class="lang__name">{{ LOCALE_INFO[l].name }}</span>
          </a>
        </li>
      </ul>
    </div>
  </details>
</template>

<style scoped>
.lang {
  position: relative;
}
.lang__toggle {
  --vf-inset: -2px -8px;
  --vf-size: 12px;
  --vf-w: 2.5px;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-weight: 700;
  font-size: 1rem;
  color: var(--ink);
  white-space: nowrap;
  list-style: none;
  cursor: pointer;
}
.lang__toggle::-webkit-details-marker {
  display: none;
}
/* The logo's frame, locking on as the panel opens. */
.lang__panel {
  --vf-inset: -9px;
  --vf-size: 20px;
  --vf-w: 3px;
  position: absolute;
  top: calc(100% + 16px);
  right: 0;
  z-index: 10;
  padding: 18px 20px;
  background: var(--card);
  box-shadow: var(--shadow-lift);
  transform: rotate(-1deg);
  transform-origin: top right;
}
.lang__panel :deep(.vf) {
  transition:
    transform 0.45s var(--ease-out),
    opacity 0.2s;
}
@starting-style {
  .lang[open] .lang__panel :deep(.vf) {
    transform: scale(1.12);
    opacity: 0;
  }
}

/*
 * The four keys around an empty centre as wide as it is tall, so the dots sit
 * on a square turned 45°, as in the logo. The names point outwards.
 */
.lang__pad {
  --key: 26px;
  --mid: 46px;
  display: grid;
  grid-template-columns: 1fr var(--mid) 1fr;
  grid-template-rows: auto var(--mid) auto;
  margin: 0;
  padding: 0;
  list-style: none;
}
.lang__slot--top {
  grid-area: 1 / 2;
}
.lang__slot--left {
  grid-area: 2 / 1;
}
.lang__slot--right {
  grid-area: 2 / 3;
}
.lang__slot--bottom {
  grid-area: 3 / 2;
}
.lang__key {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  font-weight: 700;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
}
.lang__slot--top .lang__key {
  flex-direction: column-reverse;
  padding-top: 2px;
}
.lang__slot--bottom .lang__key {
  flex-direction: column;
  padding-bottom: 2px;
}
.lang__slot--left .lang__key {
  flex-direction: row-reverse;
  justify-content: flex-start;
}
.lang__slot--left .lang__key {
  padding-inline-start: 4px;
}
.lang__slot--right .lang__key {
  padding-inline-end: 4px;
}
.lang__dot {
  flex: none;
  width: var(--key);
  height: var(--key);
  border-radius: 50%;
  background: var(--ink);
  transition:
    background-color 0.25s,
    transform 0.35s var(--ease-slap);
}
.lang__key.is-lit .lang__dot {
  background: var(--dot);
  transform: scale(1.08);
}
.lang__key:active .lang__dot {
  transform: scale(0.9);
}
.lang__name {
  font-size: 0.9375rem;
  line-height: 1.3;
}
.lang__key[aria-current] .lang__name {
  font-weight: 900;
}
.lang__key:hover .lang__name,
.lang__key:focus-visible .lang__name {
  text-decoration: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 3px;
  text-underline-offset: 3px;
}
.lang__key:focus-visible {
  outline: none;
}
.lang__key:focus-visible .lang__dot {
  outline: 3px solid var(--ink);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .lang__dot,
  .lang__panel :deep(.vf) {
    transition: none;
  }
}
</style>
