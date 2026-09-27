<script setup lang="ts">
withDefaults(defineProps<{ kind: 'loading' | 'error' | 'empty' | 'missing'; message?: string }>(), {})
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="state" :class="`state--${kind}`" :role="kind === 'error' ? 'alert' : 'status'" :aria-busy="kind === 'loading'">
    <template v-if="kind === 'loading'">
      <span class="state__ghosts" aria-hidden="true"><i></i><i></i><i></i></span>
      <p class="hand state__text">{{ message ?? '正在載入資料…' }}</p>
    </template>
    <template v-else-if="kind === 'error'">
      <p class="state__title">資料載入失敗。</p>
      <p class="state__text">{{ message ?? '無法取得資料，可能是網路連線不穩定。' }}</p>
      <button type="button" class="sticker-btn sticker-btn--ink" @click="$emit('retry')">重新載入</button>
    </template>
    <template v-else>
      <p class="state__title">{{ kind === 'missing' ? '找不到此項目。' : '目前沒有資料。' }}</p>
      <p class="state__text">{{ message }}</p>
      <slot />
    </template>
  </div>
</template>

<style scoped>
.state {
  display: grid;
  justify-items: center;
  gap: 14px;
  padding: 64px 16px;
  text-align: center;
}
.state__title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.5rem;
}
.state__text {
  color: var(--ink-2);
  max-width: 36ch;
}
.state--loading .state__text {
  font-size: 1.25rem;
  color: var(--ink);
}
.state__ghosts {
  display: flex;
  gap: 18px;
}
.state__ghosts i {
  width: 88px;
  height: 110px;
  border: 2px dashed rgb(23 22 27 / 0.35);
  border-radius: 2px;
  animation: ghost 1.4s var(--ease-out) infinite alternate;
}
.state__ghosts i:nth-child(2) {
  animation-delay: 0.2s;
  transform: rotate(2deg);
}
.state__ghosts i:nth-child(3) {
  animation-delay: 0.4s;
  transform: rotate(-1.5deg);
}
@keyframes ghost {
  to {
    border-color: var(--ink);
    background: rgb(255 255 255 / 0.5);
  }
}
</style>
