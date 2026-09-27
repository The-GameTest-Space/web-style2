<script setup lang="ts">
import { computed } from 'vue'

// Fixed digit positions: the days count lives in three cells, always.
const props = withDefaults(defineProps<{ days: number; size?: 'sm' | 'lg' }>(), { size: 'sm' })

const cells = computed(() => {
  const n = Math.min(Math.abs(props.days), 999)
  const digits = String(n).padStart(3, '0').split('')
  const firstSignificant = digits.findIndex((d) => d !== '0')
  const lead = firstSignificant === -1 ? 2 : firstSignificant
  return digits.map((d, i) => ({ d, ghost: i < lead }))
})

const label = computed(() => {
  if (props.days === 0) return '活動今天開始'
  if (props.days > 0) return `距離活動開始還有 ${props.days} 天`
  return `活動已於 ${Math.abs(props.days)} 天前開始`
})
</script>

<template>
  <span class="dday" :class="[`dday--${size}`, { 'dday--today': days === 0, 'dday--past': days < 0 }]">
    <span class="visually-hidden">{{ label }}</span>
    <span class="dday__face" aria-hidden="true">
      <template v-if="days === 0">
        <span class="dday__today">今天</span>
      </template>
      <template v-else>
        <span class="dday__prefix">{{ days > 0 ? 'D−' : 'D+' }}</span>
        <span v-for="(c, i) in cells" :key="i" class="dday__cell" :class="{ 'is-ghost': c.ghost }">{{ c.d }}</span>
      </template>
    </span>
  </span>
</template>

<style scoped>
.dday {
  display: inline-block;
  font-family: var(--font-display);
  font-weight: 800;
  line-height: 1;
  color: var(--ink);
}
.dday__face {
  display: inline-flex;
  align-items: baseline;
}
.dday--sm {
  font-size: 2.25rem;
}
.dday--lg {
  font-size: clamp(4rem, 12vw, 8.5rem);
}
.dday__prefix {
  margin-right: 0.06em;
  font-size: 0.42em;
  letter-spacing: 0;
  align-self: flex-start;
  padding-top: 0.28em;
}
.dday__cell {
  display: inline-block;
  width: 0.62em;
  text-align: center;
  font-variation-settings: 'wdth' 88;
}
.dday__cell.is-ghost {
  color: rgb(23 22 27 / 0.14);
}
.dday__today {
  font-size: 0.72em;
  padding: 0.1em 0.3em;
  background: var(--dot);
  border-radius: 6px;
}
.dday--past {
  color: var(--ink-3);
}
</style>
