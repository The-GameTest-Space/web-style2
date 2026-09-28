<script setup lang="ts">
import { signInWithDiscord } from '@/composables/useAuth'
import { useMember } from '@/composables/useMember'
import { t } from '@/i18n'
import DiscordButton from './DiscordButton.vue'
import DiscordIcon from './DiscordIcon.vue'
import StateBlock from './StateBlock.vue'

// The members' game pages show their content only to people who may upload
// games; everyone else learns how to become one.
const { status, recheck } = useMember()
</script>

<template>
  <StateBlock v-if="status === 'checking'" kind="loading" :message="t('member.checking')" />
  <StateBlock v-else-if="status === 'error'" kind="error" :message="t('member.error')" @retry="recheck" />
  <StateBlock v-else-if="status === 'unavailable'" kind="error" :message="t('member.unavailable')" @retry="recheck" />

  <section v-else-if="status !== 'member'" class="gate" aria-labelledby="gate-title">
    <div class="gate__card">
      <span class="tape tape-bit gate__tape" aria-hidden="true"></span>
      <template v-if="status === 'signed-out'">
        <h1 id="gate-title" class="gate__title">{{ t('member.signInTitle') }}</h1>
        <p class="gate__text">{{ t('member.signInText') }}</p>
        <button type="button" class="sticker-btn sticker-btn--ink" @click="signInWithDiscord()">
          <DiscordIcon />
          <span>{{ t('account.signInLabel') }}</span>
        </button>
      </template>
      <template v-else>
        <h1 id="gate-title" class="gate__title">{{ t('member.notMemberTitle') }}</h1>
        <p class="gate__text">{{ t('member.notMemberText') }}</p>
        <div class="gate__actions">
          <DiscordButton variant="ink" />
          <button type="button" class="outline-btn" @click="recheck">{{ t('member.recheck') }}</button>
        </div>
      </template>
    </div>
  </section>

  <slot v-else />
</template>

<style scoped>
.gate {
  display: grid;
  place-items: center;
  min-height: 60vh;
}
.gate__card {
  position: relative;
  display: grid;
  justify-items: start;
  gap: 16px;
  width: min(100%, 560px);
  padding: 40px 36px;
  background: var(--card);
  box-shadow: var(--shadow-lift);
  transform: rotate(-1deg);
}
.gate__tape {
  top: -11px;
  left: 50%;
  translate: -50% 0;
  rotate: 4deg;
}
.gate__title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: clamp(1.625rem, 4vw, 2.25rem);
  letter-spacing: -0.02em;
  line-height: 1.25;
}
.gate__text {
  color: var(--ink-2);
}
.gate__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
@media (max-width: 600px) {
  .gate__card {
    padding: 32px 22px;
  }
}
</style>
