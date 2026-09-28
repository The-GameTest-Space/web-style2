<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AccountMenu from './AccountMenu.vue'
import BrandMark from './BrandMark.vue'
import DiscordButton from './DiscordButton.vue'
import LocaleMenu from './LocaleMenu.vue'
import MobileMenu from './MobileMenu.vue'
import Viewfinder from './Viewfinder.vue'
import { t } from '@/i18n'

const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 8
}

// Labels differ in length from language to language, so no breakpoint suits
// them all. When the row doesn't fit, the nav first packs its items closer
// (is-compact); if that isn't enough, it sets smaller and the Discord button
// drops its label, keeping its logo (is-tight). Never a sideways scroll.
const bar = ref<HTMLElement | null>(null)
const nav = ref<HTMLElement | null>(null)
const fit = new ResizeObserver(() => {
  const el = bar.value
  if (!el) return
  const overflows = () => el.scrollWidth > el.clientWidth
  el.classList.remove('is-compact', 'is-tight')
  if (overflows()) el.classList.add('is-compact')
  if (overflows()) el.classList.add('is-tight')
})

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  // The nav changes size too, e.g. once the sign-in button appears.
  if (bar.value) fit.observe(bar.value)
  if (nav.value) fit.observe(nav.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  fit.disconnect()
})
</script>

<template>
  <header class="site-header" :class="{ 'is-scrolled': scrolled }">
    <a class="skip-link" href="#main">{{ t('header.skip') }}</a>
    <div ref="bar" class="shell site-header__bar">
      <RouterLink to="/" class="brand" :aria-label="t('header.home')">
        <BrandMark :size="38" class="brand__mark" />
        <span class="brand__word" aria-hidden="true">The Game Test Space</span>
      </RouterLink>
      <nav ref="nav" class="site-nav" :aria-label="t('header.nav')">
        <RouterLink to="/games" class="site-nav__link vf-target" active-class="is-active">
          <Viewfinder />{{ t('nav.games') }}
        </RouterLink>
        <RouterLink to="/events" class="site-nav__link vf-target" active-class="is-active">
          <Viewfinder />{{ t('nav.events') }}
        </RouterLink>
        <LocaleMenu />
        <AccountMenu />
        <MobileMenu class="site-nav__menu" />
        <DiscordButton class="site-nav__cta" />
      </nav>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgb(239 235 225 / 0.92);
  backdrop-filter: saturate(1.2) blur(10px);
  -webkit-backdrop-filter: saturate(1.2) blur(10px);
  border-bottom: 2px solid transparent;
  transition: border-color 0.3s;
}
.site-header.is-scrolled {
  border-bottom-color: var(--ink);
}
.site-header__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 76px;
}
/* Neither side shrinks: a row that doesn't fit overflows, which the script
   above sees and answers by tightening the nav. */
.brand {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--ink);
  text-decoration: none;
}
.brand__mark {
  transition: transform 0.6s var(--ease-out);
}
.brand:hover .brand__mark {
  transform: rotate(-8deg) scale(1.05);
}
.brand__word {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.375rem;
  letter-spacing: -0.035em;
  font-variation-settings: 'opsz' 96;
  white-space: nowrap;
}
.site-nav {
  flex: none;
  display: flex;
  align-items: center;
  gap: clamp(8px, 2vw, 24px);
}
.site-nav__link {
  --vf-inset: -2px -10px;
  --vf-size: 12px;
  --vf-w: 2.5px;
  position: relative;
  padding: 10px 12px;
  font-weight: 700;
  font-size: 1rem;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
}
/* Small screens only, below. */
.site-nav__menu {
  display: none;
}
.site-nav__cta {
  min-height: 46px;
  padding-block: 0.55em;
  font-size: 1rem;
  white-space: nowrap;
}
.skip-link {
  position: absolute;
  left: 16px;
  top: -60px;
  z-index: 60;
  padding: 8px 14px;
  background: var(--ink);
  color: var(--card);
  font-weight: 700;
  border-radius: 6px;
}
.skip-link:focus {
  top: 12px;
}

@media (max-width: 760px) {
  .brand__word {
    display: none;
  }
  /* The menu's frame scales in from a little larger than its panel; past the
     screen's edge that would widen the page. */
  .site-header {
    overflow-x: clip;
  }
  .site-header__bar {
    min-height: 64px;
  }
  .site-nav {
    gap: 2px;
  }
  /* The page links and the languages move into the menu. */
  .site-nav__link,
  .site-nav :deep(.lang) {
    display: none;
  }
  .site-nav__menu {
    display: block;
  }
  .site-nav__cta {
    min-height: 42px;
    padding-inline: 0.9em 1em;
    font-size: 0.9375rem;
  }
  /* The items sit close together here, so the frame hugs the label instead
     of reaching into its neighbours. It keeps the same distance from the text
     whichever padding the item has. */
  .site-nav :deep(.acct-login) {
    --vf-inset: 5px 1px;
    --vf-size: 10px;
    --vf-w: 2px;
  }
  .site-header__bar.is-compact :deep(.acct-login) {
    --vf-inset: 5px -3px;
  }
}
.site-header__bar.is-compact .site-nav__link,
.site-header__bar.is-compact :deep(.acct-login),
.site-header__bar.is-compact :deep(.lang__toggle) {
  padding-inline: 6px;
}
.site-header__bar.is-tight {
  gap: 8px;
}
.site-header__bar.is-tight .site-nav__link,
.site-header__bar.is-tight :deep(.acct-login) {
  font-size: 0.875rem;
}
.site-header__bar.is-tight .site-nav__cta :deep(span:not(.visually-hidden)) {
  display: none;
}
.site-header__bar.is-tight .site-nav__cta {
  padding-inline: 0.8em;
}
</style>
