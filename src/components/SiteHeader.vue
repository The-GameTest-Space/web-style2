<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AccountMenu from './AccountMenu.vue'
import BrandMark from './BrandMark.vue'
import DiscordButton from './DiscordButton.vue'
import Viewfinder from './Viewfinder.vue'

const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 8
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="site-header" :class="{ 'is-scrolled': scrolled }">
    <a class="skip-link" href="#main">跳至主要內容</a>
    <div class="shell site-header__bar">
      <RouterLink to="/" class="brand" aria-label="The Game Test Space 首頁">
        <BrandMark :size="38" class="brand__mark" />
        <span class="brand__word" aria-hidden="true">The Game Test Space</span>
      </RouterLink>
      <nav class="site-nav" aria-label="主選單">
        <RouterLink to="/games" class="site-nav__link vf-target" active-class="is-active">
          <Viewfinder />遊戲
        </RouterLink>
        <RouterLink to="/events" class="site-nav__link vf-target" active-class="is-active">
          <Viewfinder />活動
        </RouterLink>
        <AccountMenu />
        <DiscordButton class="site-nav__cta" label="加入 Discord" />
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
.brand {
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
}
.site-nav__cta {
  min-height: 46px;
  padding-block: 0.55em;
  font-size: 1rem;
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
  .site-header__bar {
    min-height: 64px;
  }
  .site-nav {
    gap: 2px;
  }
  .site-nav__link {
    padding: 10px 10px;
  }
  .site-nav__cta {
    min-height: 42px;
    padding-inline: 0.9em 1em;
    font-size: 0.9375rem;
  }
}
@media (max-width: 380px) {
  .site-nav__cta :deep(span:not(.visually-hidden)) {
    display: none;
  }
  .site-nav__cta {
    padding-inline: 0.8em;
  }
}
</style>
