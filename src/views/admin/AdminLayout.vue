<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { signInWithDiscord } from '@/composables/useAuth'
import { useAdmin } from '@/composables/useAdmin'
import DiscordIcon from '@/components/DiscordIcon.vue'
import StateBlock from '@/components/StateBlock.vue'
import '@/styles/forms.css'

const route = useRoute()
const { status, uid, recheck } = useAdmin()
// The events tab covers the event list and each event's page.
const onEvents = computed(() => route.name === 'admin' || String(route.name).startsWith('admin-event'))

const copied = ref(false)
async function copyUid() {
  if (!uid.value) return
  try {
    await navigator.clipboard.writeText(uid.value)
    copied.value = true
  } catch {
    /* clipboard blocked: the ID is on screen to select by hand */
  }
}
</script>

<template>
  <div class="admin shell">
    <StateBlock v-if="status === 'checking'" kind="loading" message="正在確認管理權限…" />
    <StateBlock v-else-if="status === 'error'" kind="error" message="無法確認管理權限，可能是網路連線不穩定。" @retry="recheck" />

    <section v-else-if="status !== 'admin'" class="gate" aria-labelledby="gate-title">
      <div class="gate__card">
        <span class="tape tape-bit gate__tape" aria-hidden="true"></span>
        <template v-if="status === 'signed-out'">
          <h1 id="gate-title" class="gate__title">網站管理</h1>
          <p class="gate__text">此頁面供網站管理員管理活動與遊戲，請先用 Discord 登入。</p>
          <button type="button" class="sticker-btn sticker-btn--ink" @click="signInWithDiscord()">
            <DiscordIcon />
            <span>用 Discord 登入</span>
          </button>
        </template>
        <template v-else>
          <h1 id="gate-title" class="gate__title">此帳號沒有管理權限。</h1>
          <p class="gate__text">如果您負責管理本網站，請將下方的帳號 ID 加入管理員名單。</p>
          <div class="gate__uid">
            <code class="num">{{ uid }}</code>
            <button type="button" class="outline-btn" @click="copyUid">{{ copied ? '已複製' : '複製' }}</button>
          </div>
          <RouterLink to="/" class="text-link">返回首頁</RouterLink>
        </template>
      </div>
    </section>

    <template v-else>
      <nav class="tabs" aria-label="網站管理">
        <RouterLink :to="{ name: 'admin' }" class="tabs__link" :class="{ 'is-active': onEvents }" :aria-current="onEvents ? 'page' : undefined">
          活動
        </RouterLink>
        <RouterLink :to="{ name: 'admin-games' }" class="tabs__link" exact-active-class="is-active">遊戲</RouterLink>
      </nav>
      <!-- Keyed by path so moving between the list, a new event and an event
           starts each page fresh. -->
      <RouterView :key="route.path" />
    </template>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: clamp(20px, 3vh, 32px);
  border-bottom: 3px solid var(--ink);
}
.tabs__link {
  min-height: 44px;
  padding: 10px 18px 8px;
  border-radius: 10px 10px 0 0;
  font-weight: 800;
  text-decoration: none;
  color: var(--ink-2);
  transition: background-color 0.2s;
}
.tabs__link:hover {
  background: var(--card);
}
.tabs__link.is-active {
  background: var(--ink);
  color: var(--card);
}
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
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  letter-spacing: -0.02em;
}
.gate__text {
  color: var(--ink-2);
}
.gate__uid {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background: var(--wall);
  border-radius: 10px;
}
.gate__uid code {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 1.0625rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}
</style>
