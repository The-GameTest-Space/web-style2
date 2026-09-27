<script setup lang="ts">
// The same page in another language. Plain links, not router links: each
// language has its own URL prefix, and search engines follow these too.
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Languages } from 'lucide-vue-next'
import Viewfinder from './Viewfinder.vue'
import { useDetailsMenu } from '@/composables/useDetailsMenu'
import { locale, t } from '@/i18n'
import { LOCALES, LOCALE_INFO, localePath } from '@/i18n/locales'

const route = useRoute()
const menu = ref<HTMLDetailsElement | null>(null)
useDetailsMenu(menu)
</script>

<template>
  <details ref="menu" class="lang">
    <summary class="lang__toggle vf-target">
      <Viewfinder />
      <Languages :size="20" aria-hidden="true" />
      <span class="lang__short" aria-hidden="true">{{ LOCALE_INFO[locale].short }}</span>
      <span class="visually-hidden">{{ t('lang.current', { name: LOCALE_INFO[locale].name }) }}</span>
    </summary>
    <ul class="lang__panel">
      <li v-for="l in LOCALES" :key="l">
        <a
          :href="localePath(l, route.fullPath)"
          :hreflang="LOCALE_INFO[l].hreflang"
          :lang="LOCALE_INFO[l].htmlLang"
          class="lang__link"
          :aria-current="l === locale ? 'true' : undefined"
        >
          {{ LOCALE_INFO[l].name }}
        </a>
      </li>
    </ul>
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
  gap: 6px;
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
.lang__panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 10;
  display: grid;
  gap: 2px;
  min-width: 168px;
  margin: 0;
  padding: 12px 18px;
  list-style: none;
  background: var(--card);
  box-shadow: var(--shadow-lift);
  transform: rotate(-1deg);
  transform-origin: top right;
}
.lang__link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}
.lang__link::before {
  content: '';
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.lang__link[aria-current]::before {
  background: var(--dot);
}
.lang__link:hover {
  text-decoration: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 3px;
}

@media (max-width: 760px) {
  .lang__toggle {
    padding: 10px;
  }
  .lang__short {
    display: none;
  }
}
</style>
