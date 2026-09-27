<script setup lang="ts">
import BrandMark from './BrandMark.vue'
import { DISCORD_INVITE } from '@/composables/useDiscord'
</script>

<template>
  <footer class="site-footer">
    <div class="tape site-footer__tape" aria-hidden="true"></div>
    <div class="shell site-footer__grid">
      <div class="site-footer__brand">
        <BrandMark :size="56" />
        <p class="site-footer__name">The Game Test Space</p>
        <p class="site-footer__line">台灣遊戲開發者互相試玩的社群。</p>
      </div>
      <nav class="site-footer__nav" aria-label="頁尾選單">
        <RouterLink to="/games">遊戲作品</RouterLink>
        <RouterLink to="/events">活動資訊</RouterLink>
        <a :href="DISCORD_INVITE" target="_blank" rel="noopener">Discord<span class="visually-hidden">（在新分頁開啟）</span></a>
      </nav>
      <p class="site-footer__note">
        Discord 的成員人數與線上人數為即時取自 Discord 的實際數字。如希望您的遊戲或活動在本網站刊登，請至 Discord
        與我們聯繫。
      </p>
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
