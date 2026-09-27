<script setup lang="ts">
import { computed } from 'vue'

// Taiwanese tally: every 正 is five strokes, written in stroke order.
const props = withDefaults(defineProps<{ count: number; cap?: number; animate?: boolean; delay?: number }>(), {
  cap: 60,
  animate: true,
  delay: 0,
})

const STROKES = ['M7 7H33', 'M20 7V34', 'M20 20.5H31', 'M10 20V34', 'M4 34H36']

const groups = computed(() => {
  const n = Math.min(props.count, props.cap)
  const out: number[] = []
  for (let left = n; left > 0; left -= 5) out.push(Math.min(5, left))
  return out
})

function wobble(g: number) {
  return `rotate(${((g * 37) % 7) - 3}deg)`
}
</script>

<template>
  <span class="tally" :class="{ 'tally--animate': animate }" aria-hidden="true">
    <svg v-for="(strokes, g) in groups" :key="g" viewBox="0 0 40 40" :style="{ transform: wobble(g) }">
      <path
        v-for="s in strokes"
        :key="s"
        :d="STROKES[s - 1]"
        pathLength="1"
        :style="{ '--d': `${delay + (g * 5 + s - 1) * 45}ms` }"
      />
    </svg>
    <span v-if="count > cap" class="tally__more hand">…</span>
  </span>
</template>

<style scoped>
.tally {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px 4px;
  align-items: center;
}
.tally svg {
  width: var(--tally-size, 30px);
  height: var(--tally-size, 30px);
  overflow: visible;
}
.tally path {
  fill: none;
  stroke: currentColor;
  stroke-width: 3.6;
  stroke-linecap: round;
}
.tally--animate path {
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  animation: tally-write 0.22s ease-out var(--d) both;
}
.tally__more {
  font-size: 1.5rem;
  line-height: 1;
}
@keyframes tally-write {
  from {
    stroke-dashoffset: 1;
  }
}
</style>
