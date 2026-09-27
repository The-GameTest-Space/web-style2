<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandMark from '@/components/BrandMark.vue'
import DiscordIcon from '@/components/DiscordIcon.vue'
import { finishDiscordSignIn, signInWithDiscord, takeDiscordState } from '@/composables/useAuth'
import { t } from '@/i18n'
import { DEFAULT_LOCALE, splitPath } from '@/i18n/locales'

const route = useRoute()
const router = useRouter()
const failure = ref<string | null>(null)
const returnTo = ref('/')

onMounted(async () => {
  const { code, state, error } = route.query
  const saved = takeDiscordState()
  if (saved) returnTo.value = saved.returnTo

  if (error) {
    failure.value = t('signIn.cancelled')
    return
  }
  if (!saved || typeof code !== 'string' || state !== saved.state) {
    failure.value = t('signIn.expired')
    return
  }
  try {
    await finishDiscordSignIn(code)
    // This page is always at the unprefixed URL: a page in another language
    // is under another router base, so it takes a page load.
    if (splitPath(returnTo.value).locale === DEFAULT_LOCALE) router.replace(returnTo.value)
    else location.replace(returnTo.value)
  } catch (e) {
    console.error(e)
    failure.value = t('signIn.error')
  }
})
</script>

<template>
  <section class="cb shell" aria-labelledby="cb-title">
    <div class="cb__card">
      <span class="tape tape-bit cb__tape" aria-hidden="true"></span>
      <BrandMark :size="64" />
      <template v-if="failure">
        <h1 id="cb-title" class="cb__title">{{ t('signIn.failed') }}</h1>
        <p class="cb__text" role="alert">{{ failure }}</p>
        <div class="cb__actions">
          <button type="button" class="sticker-btn sticker-btn--ink" @click="signInWithDiscord(returnTo)">
            <DiscordIcon />
            <span>{{ t('signIn.retry') }}</span>
          </button>
          <a :href="returnTo" class="text-link">{{ t('signIn.back') }}</a>
        </div>
      </template>
      <template v-else>
        <h1 id="cb-title" class="cb__title">{{ t('signIn.pending') }}</h1>
        <p class="cb__text hand cb__hand" role="status">{{ t('signIn.checking') }}</p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.cb {
  display: grid;
  place-items: center;
  min-height: 70vh;
  padding-block: 64px;
}
.cb__card {
  position: relative;
  display: grid;
  justify-items: start;
  gap: 16px;
  width: min(100%, 520px);
  padding: 40px 36px;
  background: var(--card);
  box-shadow: var(--shadow-lift);
  transform: rotate(-1.5deg);
}
.cb__tape {
  top: -11px;
  left: 50%;
  translate: -50% 0;
  rotate: 4deg;
}
.cb__title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  letter-spacing: -0.02em;
}
.cb__text {
  color: var(--ink-2);
}
.cb__hand {
  font-size: 1.25rem;
  color: var(--ink);
}
.cb__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
  margin-top: 8px;
}
</style>
