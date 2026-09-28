<script setup lang="ts">
import { Instagram } from 'lucide-vue-next'
import BrandMark from './BrandMark.vue'
import DiscordIcon from './DiscordIcon.vue'
import ThreadsIcon from './ThreadsIcon.vue'
import { DISCORD_INVITE } from '@/composables/useDiscord'
import { t } from '@/i18n'

const THREADS = 'https://www.threads.com/@gametestspace'
const INSTAGRAM = 'https://www.instagram.com/gametestspace/'
</script>

<template>
  <footer class="site-footer">
    <div class="tape site-footer__tape" aria-hidden="true"></div>
    <div class="shell site-footer__grid">
      <div class="site-footer__brand">
        <BrandMark :size="56" class="site-footer__mark" />
        <p class="site-footer__name">The Game Test Space</p>
        <p class="site-footer__line">{{ t('site.tagline') }}</p>
      </div>
      <nav class="site-footer__nav" :aria-label="t('footer.nav')">
        <a :href="THREADS" target="_blank" rel="noopener">
          <ThreadsIcon />Threads<span class="visually-hidden">{{ t('common.newTab') }}</span>
        </a>
        <a :href="INSTAGRAM" target="_blank" rel="noopener">
          <Instagram :size="20" aria-hidden="true" />Instagram<span class="visually-hidden">{{ t('common.newTab') }}</span>
        </a>
        <a :href="DISCORD_INVITE" target="_blank" rel="noopener">
          <DiscordIcon />Discord<span class="visually-hidden">{{ t('common.newTab') }}</span>
        </a>
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
  gap: 10px;
  font-weight: 700;
}
.site-footer__nav a {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  width: fit-content;
}
.site-footer__nav a:hover {
  text-decoration: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 3px;
}
.site-footer__nav svg {
  flex: none;
  width: 20px;
  height: 20px;
  transition: color 0.2s;
}
.site-footer__nav a:hover svg {
  color: var(--dot);
}
.site-footer__note {
  font-size: 0.875rem;
  line-height: 1.75;
  color: var(--ink-2);
  max-width: 44ch;
}
/* Tablets: the logo with the links under it on the left; the name, tagline
   and note on the right, the note filling the width. The brand block opens
   up so its logo and its words can take different columns. */
@media (min-width: 641px) and (max-width: 860px) {
  .site-footer__grid {
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas:
      'mark name'
      'mark line'
      'nav note';
    gap: 0 40px;
  }
  .site-footer__brand {
    display: contents;
  }
  .site-footer__mark {
    grid-area: mark;
    align-self: center;
  }
  .site-footer__name {
    grid-area: name;
    margin-top: 0;
  }
  .site-footer__line {
    grid-area: line;
  }
  .site-footer__nav {
    grid-area: nav;
    gap: 0;
    margin-top: 24px;
  }
  .site-footer__nav a {
    min-height: 44px;
  }
  .site-footer__note {
    grid-area: note;
    margin-top: 32px;
    max-width: none;
  }
}
/* Phones: one column, the links in a row of finger-sized targets. */
@media (max-width: 640px) {
  .site-footer__grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
  .site-footer__nav {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0 24px;
  }
  .site-footer__nav a {
    min-height: 44px;
  }
}
</style>
