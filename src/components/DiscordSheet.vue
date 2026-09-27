<script setup lang="ts">
import { useDiscord, DISCORD_INVITE } from '@/composables/useDiscord'
import TallyMarks from './TallyMarks.vue'
import DiscordButton from './DiscordButton.vue'
import I18nT from './I18nT.vue'
import { t } from '@/i18n'

withDefaults(defineProps<{ size?: 'sm' | 'lg'; delay?: number; tilt?: number }>(), { size: 'sm', delay: 0, tilt: 1.5 })

const { presence, status } = useDiscord()
</script>

<template>
  <section
    class="sheet"
    :class="`sheet--${size}`"
    :style="{ '--tilt': `${tilt}deg`, '--delay': `${delay}ms` }"
    :aria-label="t('discord.status')"
  >
    <span class="tape tape-bit sheet__tape sheet__tape--l" aria-hidden="true"></span>
    <span class="tape tape-bit sheet__tape sheet__tape--r" aria-hidden="true"></span>
    <header class="sheet__head">
      <p class="sheet__title">{{ t('discord.title') }}</p>
      <p class="sheet__guild">{{ presence?.guildName ?? 'The Game Test Space' }} · Discord</p>
    </header>

    <div v-if="status === 'ready' && presence" class="sheet__rows">
      <div class="sheet__row">
        <span class="sheet__label">{{ t('discord.online') }}</span>
        <span class="sheet__value">
          <TallyMarks :count="presence.online" :delay="delay + 300" class="sheet__tally" />
          <strong class="num sheet__num">{{ presence.online }}</strong>
          <span v-if="t('discord.unit')" class="visually-hidden">{{ t('discord.unit') }}</span>
        </span>
      </div>
      <div class="sheet__row">
        <span class="sheet__label">{{ t('discord.members') }}</span>
        <span class="sheet__value">
          <strong class="num sheet__num">{{ presence.members }}</strong>
          <span v-if="t('discord.unit')" class="sheet__unit">{{ t('discord.unit') }}</span>
        </span>
      </div>
      <p class="sheet__source">{{ t('discord.source') }}</p>
    </div>
    <div v-else-if="status === 'unavailable'" class="sheet__rows">
      <p class="sheet__fallback hand">
        <I18nT k="discord.unavailable"><template #br><br /></template></I18nT>
      </p>
    </div>
    <div v-else class="sheet__rows sheet__rows--loading" aria-busy="true">
      <span class="sheet__line"></span>
      <span class="sheet__line"></span>
      <span class="visually-hidden">{{ t('discord.loading') }}</span>
    </div>

    <footer class="sheet__foot">
      <DiscordButton v-if="size === 'lg'" variant="ink" :label="t('discord.join')" />
      <a v-else :href="DISCORD_INVITE" class="text-link sheet__join" target="_blank" rel="noopener">
        {{ t('discord.join') }} →<span class="visually-hidden">{{ t('common.newTab') }}</span>
      </a>
    </footer>
  </section>
</template>

<style scoped>
.sheet {
  position: relative;
  background-color: var(--card);
  /* Ruled like a sign-up sheet on a clipboard. */
  background-image: repeating-linear-gradient(180deg, transparent 0 43px, rgb(23 22 27 / 0.1) 43px 44px);
  background-position: 0 70px;
  padding: 22px 24px 20px;
  box-shadow: var(--shadow-paper);
  transform: rotate(var(--tilt));
}
.sheet__tape {
  top: -11px;
}
.sheet__tape--l {
  left: 18px;
  rotate: -8deg;
}
.sheet__tape--r {
  right: 18px;
  rotate: 6deg;
}
.sheet__head {
  padding-bottom: 12px;
  border-bottom: 3px solid var(--ink);
}
.sheet__title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.375rem;
  line-height: 1.2;
}
.sheet__guild {
  margin-top: 2px;
  font-size: 0.8125rem;
  color: var(--ink-3);
}
.sheet__rows {
  padding-top: 8px;
}
.sheet__row {
  display: grid;
  grid-template-columns: 5.5em minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 6px 0;
}
.sheet__label {
  font-size: 0.875rem;
  font-weight: 700;
}
.sheet__value {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
}
.sheet__num {
  font-size: 1.75rem;
  line-height: 1;
}
.sheet__unit {
  font-size: 0.875rem;
  margin-left: -6px;
}
.sheet__tally {
  --tally-size: 22px;
  flex: 1 1 100%;
  max-width: 100%;
  color: var(--ink);
}
.sheet__source {
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--ink-3);
}
.sheet__fallback {
  padding: 10px 0;
  font-size: 1.25rem;
  line-height: 1.5;
}
.sheet__rows--loading {
  display: grid;
  gap: 18px;
  padding: 18px 0 10px;
}
.sheet__line {
  height: 12px;
  width: 70%;
  border-radius: 6px;
  background: var(--wall);
  animation: sheet-pulse 1.2s ease-in-out infinite alternate;
}
.sheet__line + .sheet__line {
  width: 45%;
}
.sheet__foot {
  margin-top: 14px;
}
.sheet__join {
  font-size: 1rem;
}

.sheet--lg {
  padding: 30px 34px 30px;
  background-position: 0 96px;
}
.sheet--lg .sheet__title {
  font-size: clamp(1.75rem, 3vw, 2.25rem);
}
.sheet--lg .sheet__guild {
  font-size: 0.9375rem;
}
.sheet--lg .sheet__row {
  grid-template-columns: 6.5em minmax(0, 1fr);
  min-height: 64px;
}
.sheet--lg .sheet__label {
  font-size: 1rem;
}
.sheet--lg .sheet__num {
  font-size: 2.75rem;
}
.sheet--lg .sheet__tally {
  --tally-size: 34px;
}
.sheet--lg .sheet__foot {
  margin-top: 24px;
}
@keyframes sheet-pulse {
  to {
    opacity: 0.45;
  }
}
</style>
