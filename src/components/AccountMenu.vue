<script setup lang="ts">
import { ref } from 'vue'
import Viewfinder from './Viewfinder.vue'
import { DISCORD_CLIENT_ID, signInWithDiscord, useAuth } from '@/composables/useAuth'
import { useAdmin } from '@/composables/useAdmin'
import { useDetailsMenu } from '@/composables/useDetailsMenu'
import { t } from '@/i18n'

const { user, ready, signOut } = useAuth()
const { status: adminStatus } = useAdmin()
const menu = ref<HTMLDetailsElement | null>(null)
const { close } = useDetailsMenu(menu)

async function onSignOut() {
  close()
  await signOut()
}
</script>

<template>
  <!-- Without a Discord app configured, sign-in would only reach an error page. -->
  <template v-if="!DISCORD_CLIENT_ID"></template>
  <!-- Hold the slot while the saved session loads so the nav does not jump. -->
  <span v-else-if="!ready" class="acct-slot" aria-hidden="true"></span>
  <button
    v-else-if="!user"
    type="button"
    class="acct-login vf-target"
    :aria-label="t('account.signInLabel')"
    @click="signInWithDiscord()"
  >
    <Viewfinder />{{ t('account.signIn') }}
  </button>
  <details v-else ref="menu" class="acct">
    <summary class="acct__toggle">
      <img v-if="user.photoURL" class="acct__avatar" :src="user.photoURL" alt="" width="36" height="36" />
      <span v-else class="acct__avatar acct__initial" aria-hidden="true">{{ user.displayName?.[0] ?? '?' }}</span>
      <span class="visually-hidden">{{ t('account.menu', { name: user.displayName ?? '' }) }}</span>
    </summary>
    <div class="acct__panel">
      <p class="acct__name">{{ user.displayName }}</p>
      <p class="acct__via">{{ t('account.via') }}</p>
      <RouterLink to="/my/games" class="acct__admin">{{ t('account.myGames') }}</RouterLink>
      <RouterLink v-if="adminStatus === 'admin'" to="/admin" class="acct__admin">{{ t('account.admin') }}</RouterLink>
      <button type="button" class="acct__out" @click="onSignOut">{{ t('account.signOut') }}</button>
    </div>
  </details>
</template>

<style scoped>
.acct-slot {
  display: inline-block;
  width: 40px;
  height: 40px;
}
.acct-login {
  --vf-inset: -2px -10px;
  --vf-size: 12px;
  --vf-w: 2.5px;
  position: relative;
  padding: 10px 12px;
  border: 0;
  background: none;
  font-weight: 700;
  font-size: 1rem;
  line-height: inherit;
  color: var(--ink);
  white-space: nowrap;
  cursor: pointer;
}
.acct {
  position: relative;
}
.acct__toggle {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  list-style: none;
  cursor: pointer;
}
.acct__toggle::-webkit-details-marker {
  display: none;
}
.acct__avatar {
  width: 36px;
  height: 36px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: var(--wall-shade);
  transition: transform 0.35s var(--ease-out);
}
.acct__initial {
  display: grid;
  place-items: center;
  font-weight: 900;
}
.acct__toggle:hover .acct__avatar,
.acct[open] .acct__avatar {
  transform: rotate(-6deg) scale(1.05);
}
.acct__panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 10;
  display: grid;
  gap: 2px;
  min-width: 200px;
  padding: 16px 18px;
  background: var(--card);
  box-shadow: var(--shadow-lift);
  transform: rotate(1deg);
  transform-origin: top right;
}
.acct__name {
  font-weight: 900;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.acct__via {
  font-size: 0.875rem;
  color: var(--ink-3);
}
.acct__admin {
  justify-self: start;
  margin-top: 10px;
  padding: 4px 0;
  font-weight: 700;
  text-decoration: none;
}
.acct__admin:hover {
  text-decoration: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 3px;
}
.acct__out {
  justify-self: start;
  margin-top: 10px;
  padding: 4px 0;
  border: 0;
  background: none;
  font-weight: 700;
  text-decoration-line: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 3px;
  cursor: pointer;
}
.acct__out:hover {
  text-decoration-color: var(--ink);
}

@media (max-width: 760px) {
  .acct-login {
    padding: 10px 10px;
  }
}
</style>
