<script setup lang="ts">
import DiscordIcon from './DiscordIcon.vue'
import { DISCORD_INVITE } from '@/composables/useDiscord'
import { t } from '@/i18n'

withDefaults(defineProps<{ variant?: 'dot' | 'ink' | 'paper'; label?: string }>(), {
  variant: 'dot',
  label: () => t('common.joinDiscord'),
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
    <span class="visually-hidden">{{ t('common.newTab') }}</span>
  </a>
</template>
