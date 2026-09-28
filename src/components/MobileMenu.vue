<script setup lang="ts">
// The header on small screens: the page links and the languages folded behind
// one button, since the bar has no room to show them. SiteHeader swaps this
// in for its own links and LocaleMenu. As in the logo, the orange dot marks
// the page's language.
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'
import Viewfinder from './Viewfinder.vue'
import { useDetailsMenu } from '@/composables/useDetailsMenu'
import { locale, t } from '@/i18n'
import { LOCALES, LOCALE_INFO, localePath } from '@/i18n/locales'

const route = useRoute()
const menu = ref<HTMLDetailsElement | null>(null)
// Tapping the page already open changes no route, so the links close it too.
const { close } = useDetailsMenu(menu)
</script>

<template>
  <details ref="menu" class="menu">
    <summary class="menu__toggle vf-target">
      <Viewfinder />
      <Menu class="menu__icon menu__icon--open" :size="24" aria-hidden="true" />
      <X class="menu__icon menu__icon--close" :size="24" aria-hidden="true" />
      <span class="visually-hidden">{{ t('header.menu') }}</span>
    </summary>
    <div class="menu__panel vf-target is-active">
      <Viewfinder />
      <ul class="menu__pages">
        <li>
          <RouterLink to="/games" class="menu__page" active-class="is-active" @click="close">
            {{ t('nav.games') }}
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/events" class="menu__page" active-class="is-active" @click="close">
            {{ t('nav.events') }}
          </RouterLink>
        </li>
      </ul>
      <p id="menu-langs" class="menu__label">{{ t('lang.label') }}</p>
      <ul class="menu__langs" aria-labelledby="menu-langs">
        <li v-for="l in LOCALES" :key="l">
          <a
            :href="localePath(l, route.fullPath)"
            :hreflang="LOCALE_INFO[l].hreflang"
            :lang="LOCALE_INFO[l].htmlLang"
            class="menu__lang"
            :aria-current="l === locale ? 'true' : undefined"
          >
            <span class="menu__dot" aria-hidden="true"></span>{{ LOCALE_INFO[l].name }}
          </a>
        </li>
      </ul>
    </div>
  </details>
</template>

<style scoped>
.menu__toggle {
  --vf-inset: 4px;
  --vf-size: 10px;
  --vf-w: 2px;
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: var(--ink);
  list-style: none;
  cursor: pointer;
}
.menu__toggle::-webkit-details-marker {
  display: none;
}
.menu__icon--close,
.menu[open] .menu__icon--open {
  display: none;
}
.menu[open] .menu__icon--close {
  display: block;
}
.menu[open] > .menu__toggle :deep(.vf i) {
  opacity: 1;
  transform: none;
}

/* Placed against the header, the nearest positioned box, so it stays on
   screen whatever sits beside the button. The logo's frame locks on as it
   opens. */
.menu__panel {
  --vf-inset: -9px;
  --vf-size: 20px;
  --vf-w: 3px;
  position: absolute;
  top: calc(100% + 12px);
  right: var(--gutter);
  z-index: 10;
  width: min(240px, calc(100vw - var(--gutter) * 2));
  padding: 12px 22px 16px;
  background: var(--card);
  box-shadow: var(--shadow-lift);
  transform: rotate(-1deg);
  transform-origin: top right;
}
.menu__panel :deep(.vf) {
  transition:
    transform 0.45s var(--ease-out),
    opacity 0.2s;
}
@starting-style {
  .menu[open] .menu__panel :deep(.vf) {
    transform: scale(1.12);
    opacity: 0;
  }
}

.menu__pages,
.menu__langs {
  margin: 0;
  padding: 0;
  list-style: none;
}
.menu__page {
  display: block;
  padding: 8px 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.5rem;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--ink);
  text-decoration: none;
}
.menu__page.is-active {
  text-decoration: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 4px;
  text-underline-offset: 6px;
}

.menu__label {
  margin: 12px 0 4px;
  padding-top: 14px;
  border-top: 2px solid var(--rule);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--ink-3);
}
.menu__lang {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-weight: 700;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
}
.menu__dot {
  flex: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ink);
}
.menu__lang[aria-current] {
  font-weight: 900;
}
.menu__lang[aria-current] .menu__dot {
  background: var(--dot);
}

@media (prefers-reduced-motion: reduce) {
  .menu__panel :deep(.vf) {
    transition: none;
  }
}
</style>
