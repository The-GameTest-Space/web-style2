<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ count: number; max?: number; animate?: boolean; delay?: number; size?: 'sm' | 'lg' }>(),
  { max: 10, animate: false, delay: 0, size: 'sm' },
)

// A loose cluster, the way stickers land when people press them on fast.
const OFFSETS = [
  [0, 0], [21, -3], [42, 2], [8, 17], [30, 16], [52, 19], [-2, 34], [19, 33], [40, 36], [61, 33],
]

const shown = computed(() => Math.min(props.count, props.max))
const extra = computed(() => Math.max(0, props.count - props.max))
</script>

<template>
  <span class="dots" :class="[`dots--${size}`, { 'dots--animate': animate }]">
    <span class="dots__cluster" aria-hidden="true">
      <i
        v-for="n in shown"
        :key="n"
        :style="{
          '--x': `${OFFSETS[(n - 1) % OFFSETS.length]![0]}%`,
          '--y': `${OFFSETS[(n - 1) % OFFSETS.length]![1]}%`,
          '--d': `${delay + (n - 1) * 70}ms`,
          '--r': `${((n * 47) % 30) - 15}deg`,
        }"
      ></i>
    </span>
    <span v-if="extra && !$slots.default" class="dots__extra num" aria-hidden="true">+{{ extra }}</span>
    <slot />
  </span>
</template>

<style scoped>
.dots {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.dots__cluster {
  position: relative;
  display: inline-block;
  width: var(--w);
  height: var(--h);
}
.dots--sm {
  --dot-size: 14px;
  --w: 92px;
  --h: 34px;
}
.dots--lg {
  --dot-size: 24px;
  --w: 176px;
  --h: 62px;
}
.dots__cluster i {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--dot-size);
  height: var(--dot-size);
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.35), transparent 45%),
    var(--dot);
  box-shadow: 0 1px 1.5px rgb(23 22 27 / 0.28);
  transform: rotate(var(--r));
}
.dots--animate .dots__cluster i {
  animation: dot-land 0.5s var(--ease-slap) var(--d) both;
}
.dots__extra {
  font-size: 0.875rem;
  font-weight: 800;
  color: var(--ink);
}
@keyframes dot-land {
  from {
    opacity: 0;
    transform: translateY(-14px) scale(1.6) rotate(var(--r));
  }
  60% {
    opacity: 1;
  }
  to {
    transform: rotate(var(--r));
  }
}
</style>
