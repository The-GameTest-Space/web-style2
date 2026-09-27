<script setup lang="ts">
// Stands where the D-day counter would for an event with no end.
import { t } from '@/i18n'

withDefaults(defineProps<{ size?: 'sm' | 'lg' }>(), { size: 'sm' })
</script>

<template>
  <span class="ongoing" :class="`ongoing--${size}`">
    <span class="ongoing__dot" aria-hidden="true"></span>{{ t('ongoing.mark') }}
  </span>
</template>

<style scoped>
.ongoing {
  display: inline-flex;
  align-items: center;
  gap: 0.22em;
  font-family: var(--font-body);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.02em;
  white-space: nowrap;
  color: var(--ink);
}
.ongoing--sm {
  font-size: 1.75rem;
}
.ongoing--lg {
  font-size: clamp(3.25rem, 9vw, 6.5rem);
}
.ongoing__dot {
  flex: none;
  width: 0.36em;
  height: 0.36em;
  border-radius: 50%;
  background: var(--dot);
}
</style>
