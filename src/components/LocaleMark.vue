<script setup lang="ts">
// The brand mark's four dots, one per language in LOCALES order: top, left,
// right, bottom. The orange dot sits on `active`, so for zh-TW (the default,
// on top) the mark is the logo's own. It hops when `active` changes.
import { computed } from 'vue'

const props = withDefaults(defineProps<{ active: number; size?: number | string }>(), { size: 22 })

// Dot centres in BrandMark's coordinates.
const DOTS = [
  [540, 407],
  [407, 540],
  [673, 540],
  [540, 673],
] as const

const hop = computed(() => {
  const [x, y] = DOTS[props.active] ?? DOTS[0]
  return `translate(${x - DOTS[0][0]}px, ${y - DOTS[0][1]}px)`
})
</script>

<template>
  <svg class="locale-mark" viewBox="327 327 426 426" :width="size" :height="size" aria-hidden="true">
    <circle v-for="([cx, cy], i) in DOTS" :key="i" :cx="cx" :cy="cy" r="70" fill="currentColor" />
    <circle class="locale-mark__lead" :cx="DOTS[0][0]" :cy="DOTS[0][1]" r="72" :style="{ transform: hop }" />
  </svg>
</template>

<style scoped>
.locale-mark {
  flex: none;
  overflow: visible;
}
.locale-mark__lead {
  fill: var(--dot);
  transition: transform 0.45s var(--ease-slap);
}
@media (prefers-reduced-motion: reduce) {
  .locale-mark__lead {
    transition: none;
  }
}
</style>
