<script setup lang="ts">
withDefaults(defineProps<{ as?: 'h1' | 'h2' | 'h3'; tilt?: number; id?: string }>(), { as: 'h2', tilt: -1.2 })
</script>

<template>
  <component :is="as" :id="id" class="tape tape-heading" :style="{ '--tilt': `${tilt}deg` }">
    <slot />
  </component>
</template>

<style scoped>
.tape-heading {
  --tear: 12px;
  display: inline-block;
  padding: 0.28em 0.9em 0.34em;
  font-size: clamp(1.625rem, 3.4vw, 2.5rem);
  letter-spacing: -0.02em;
  line-height: 1.15;
  transform: rotate(var(--tilt));
  box-shadow: 0 2px 3px rgb(23 22 27 / 0.2);
}
</style>
