<script setup lang="ts">
import BrandMark from './BrandMark.vue'
import { DISCORD_INVITE } from '@/composables/useDiscord'
import { t } from '@/i18n'
</script>

<template>
  <footer class="site-footer">
    <div class="tape site-footer__tape" aria-hidden="true"></div>
    <div class="shell site-footer__grid">
      <div class="site-footer__brand">
        <BrandMark :size="56" />
        <p class="site-footer__name">The Game Test Space</p>
        <p class="site-footer__line">{{ t('site.tagline') }}</p>
      </div>
      <nav class="site-footer__nav" :aria-label="t('footer.nav')">
        <RouterLink to="/games">{{ t('footer.games') }}</RouterLink>
        <RouterLink to="/events">{{ t('footer.events') }}</RouterLink>
        <a :href="DISCORD_INVITE" target="_blank" rel="noopener">Discord<span class="visually-hidden">{{ t('common.newTab') }}</span></a>
      </nav>
      <p class="site-footer__note">{{ t('footer.note') }}</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  overflow-x: clip;
  margin-top: 0;
  padding: 56px 0 48px;
}
.site-footer__tape {
  position: absolute;
  top: -12px;
  left: -2%;
  width: 104%;
  height: 26px;
  --tear: 0px;
  transform: rotate(-0.6deg);
}
.site-footer__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1.4fr);
  gap: 32px 48px;
  align-items: start;
}
.site-footer__name {
  margin-top: 14px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: -0.035em;
  line-height: 1.1;
}
.site-footer__line {
  margin-top: 6px;
  color: var(--ink-2);
}
.site-footer__nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 700;
}
.site-footer__nav a {
  text-decoration: none;
  width: fit-content;
}
.site-footer__nav a:hover {
  text-decoration: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 3px;
}
.site-footer__note {
  font-size: 0.875rem;
  line-height: 1.75;
  color: var(--ink-2);
  max-width: 44ch;
}
@media (max-width: 860px) {
  .site-footer__grid {
    grid-template-columns: 1fr 1fr;
  }
  .site-footer__note {
    grid-column: 1 / -1;
  }
}
</style>
