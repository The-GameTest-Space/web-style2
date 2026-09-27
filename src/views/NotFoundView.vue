<script setup lang="ts">
import BrandMark from '@/components/BrandMark.vue'
</script>

<template>
  <section class="nf shell" aria-labelledby="nf-title">
    <div class="nf__card">
      <span class="tape tape-bit nf__tape" aria-hidden="true"></span>
      <BrandMark :size="64" />
      <h1 id="nf-title" class="nf__title">找不到您要查看的頁面。</h1>
      <p class="nf__text">網址可能有誤，或該頁面已被移除。</p>
      <div class="nf__actions">
        <RouterLink to="/" class="sticker-btn">返回首頁</RouterLink>
        <RouterLink to="/games" class="text-link">瀏覽遊戲作品</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.nf {
  display: grid;
  place-items: center;
  min-height: 70vh;
  padding-block: 64px;
}
.nf__card {
  position: relative;
  display: grid;
  justify-items: start;
  gap: 16px;
  max-width: 520px;
  padding: 40px 36px;
  background: var(--card);
  box-shadow: var(--shadow-lift);
  transform: rotate(-1.5deg);
}
.nf__tape {
  top: -11px;
  left: 50%;
  translate: -50% 0;
  rotate: 4deg;
}
.nf__title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  letter-spacing: -0.02em;
}
.nf__text {
  color: var(--ink-2);
}
.nf__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
  margin-top: 8px;
}
</style>
