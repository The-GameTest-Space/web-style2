<script setup lang="ts">
import DiscordIcon from './DiscordIcon.vue'
import { DISCORD_INVITE } from '@/composables/useDiscord'

withDefaults(defineProps<{ variant?: 'dot' | 'ink' | 'paper'; label?: string }>(), {
  variant: 'dot',
  label: '加入 Discord',
})
</script>

<template>
  <a
    class="sticker-btn"
    :class="variant !== 'dot' && `sticker-btn--${variant}`"
    :href="DISCORD_INVITE"
    target="_blank"
    rel="noopener"
  >
    <DiscordIcon />
    <span>{{ label }}</span>
    <span class="visually-hidden">（在新分頁開啟）</span>
  </a>
</template>
