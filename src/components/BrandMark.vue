<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; label?: string }>(), { size: 40 })
</script>

<template>
  <svg
    class="brand-mark"
    viewBox="196 196 688 688"
    :width="size"
    :height="size"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <g fill="none" stroke="currentColor" stroke-width="48" stroke-linecap="round">
      <path class="bm-corner" d="M245 383v-83a55 55 0 0 1 55-55h85" />
      <path class="bm-corner" d="M695 245h83a55 55 0 0 1 55 55v83" />
      <path class="bm-corner" d="M833 697v83a55 55 0 0 1-55 55h-83" />
      <path class="bm-corner" d="M385 835h-85a55 55 0 0 1-55-55v-83" />
    </g>
    <circle class="bm-dot bm-dot--lead" cx="540" cy="407" r="70" fill="var(--dot)" />
    <circle class="bm-dot" cx="407" cy="540" r="70" fill="currentColor" />
    <circle class="bm-dot" cx="673" cy="540" r="70" fill="currentColor" />
    <circle class="bm-dot" cx="540" cy="673" r="70" fill="currentColor" />
  </svg>
</template>
