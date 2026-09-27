<script setup lang="ts">
// A message with elements in it. Each {name} in the message is filled by the
// slot of that name, so every language can put the element where its grammar
// wants it: <I18nT k="games.count" :n="3"><template #n><strong>3</strong></template></I18nT>
import { computed } from 'vue'
import { template, type MessageKey } from '@/i18n'

const props = defineProps<{ k: MessageKey; n?: number }>()

// Text and slot names alternate: ['共有 ', 'n', ' 款遊戲'].
const parts = computed(() => template(props.k, props.n).split(/\{(\w+)\}/))
</script>

<template>
  <template v-for="(part, i) in parts" :key="i">
    <slot v-if="i % 2" :name="part" />
    <template v-else>{{ part }}</template>
  </template>
</template>
