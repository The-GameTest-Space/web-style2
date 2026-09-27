<script setup lang="ts">
withDefaults(defineProps<{ text?: string }>(), { text: '示範資料：實際作品徵集中' })
</script>

<template>
  <p class="sample-note hand">
    <svg class="sample-note__ring" viewBox="0 0 120 44" preserveAspectRatio="none" aria-hidden="true">
      <path d="M8 24C6 12 38 4 66 5s50 8 48 19-30 16-60 15S5 35 12 20c3-5 12-9 22-11" />
    </svg>
    <span>{{ text }}</span>
  </p>
</template>

<style scoped>
.sample-note {
  position: relative;
  display: inline-block;
  padding: 0.5em 1.1em;
  font-size: 1.0625rem;
  line-height: 1.3;
  color: var(--ink);
  transform: rotate(-2deg);
}
.sample-note__ring {
  position: absolute;
  inset: -2px -6px;
  width: calc(100% + 12px);
  height: calc(100% + 4px);
  overflow: visible;
  fill: none;
  stroke: var(--dot);
  stroke-width: 2.5;
  stroke-linecap: round;
}
.sample-note__ring path {
  vector-effect: non-scaling-stroke;
}
</style>
