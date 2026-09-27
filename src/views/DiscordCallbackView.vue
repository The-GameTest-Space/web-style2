<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandMark from '@/components/BrandMark.vue'
import DiscordIcon from '@/components/DiscordIcon.vue'
import { finishDiscordSignIn, signInWithDiscord, takeDiscordState } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const failure = ref<string | null>(null)
const returnTo = ref('/')

onMounted(async () => {
  const { code, state, error } = route.query
  const saved = takeDiscordState()
  if (saved) returnTo.value = saved.returnTo

  if (error) {
    failure.value = '您在 Discord 取消了授權，所以沒有登入。'
    return
  }
  if (!saved || typeof code !== 'string' || state !== saved.state) {
    failure.value = '這個登入連結已失效，請重新登入一次。'
    return
  }
  try {
    await finishDiscordSignIn(code)
    router.replace(returnTo.value)
  } catch (e) {
    console.error(e)
    failure.value = '無法完成登入，可能是網路不穩定，請稍後再試。'
  }
})
</script>

<template>
  <section class="cb shell" aria-labelledby="cb-title">
    <div class="cb__card">
      <span class="tape tape-bit cb__tape" aria-hidden="true"></span>
      <BrandMark :size="64" />
      <template v-if="failure">
        <h1 id="cb-title" class="cb__title">登入失敗。</h1>
        <p class="cb__text" role="alert">{{ failure }}</p>
        <div class="cb__actions">
          <button type="button" class="sticker-btn sticker-btn--ink" @click="signInWithDiscord(returnTo)">
            <DiscordIcon />
            <span>重新登入</span>
          </button>
          <RouterLink :to="returnTo" class="text-link">返回上一頁</RouterLink>
        </div>
      </template>
      <template v-else>
        <h1 id="cb-title" class="cb__title">登入中…</h1>
        <p class="cb__text hand cb__hand" role="status">正在向 Discord 確認您的身分</p>
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
