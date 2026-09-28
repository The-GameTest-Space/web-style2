<script setup lang="ts">
import { ref, watch } from 'vue'
import { ExternalLink, Plus } from 'lucide-vue-next'
import { myApi } from '@/api/my'
import type { OwnGame } from '@/api/types'
import { useMember } from '@/composables/useMember'
import { fullDate, gameStatusLabel } from '@/utils/format'
import { t } from '@/i18n'
import MemberGate from '@/components/MemberGate.vue'
import StateBlock from '@/components/StateBlock.vue'
import TapeHeading from '@/components/TapeHeading.vue'
import '@/styles/forms.css'

const { status } = useMember()
const games = ref<OwnGame[] | null>(null)
const failed = ref(false)

async function load() {
  failed.value = false
  try {
    games.value = (await myApi.games()).items
  } catch (e) {
    console.error(e)
    failed.value = true
  }
}
// Once the gate lets the visitor in.
watch(status, (s) => s === 'member' && !games.value && load(), { immediate: true })

/** An update's day (YYYY-MM-DD) as a date in the page's language; a bare day parses as UTC. */
const day = (d: string) => fullDate(`${d}T00:00`)
</script>

<template>
  <div class="member shell">
    <MemberGate>
      <header class="admin-head">
        <div>
          <TapeHeading as="h1" :tilt="-1">{{ t('myGames.title') }}</TapeHeading>
          <p class="admin-head__lede">{{ t('myGames.lede') }}</p>
        </div>
        <RouterLink to="/games/new" class="sticker-btn sticker-btn--ink"><Plus aria-hidden="true" />{{ t('games.upload') }}</RouterLink>
      </header>

      <StateBlock v-if="!games && !failed" kind="loading" :message="t('myGames.loading')" />
      <StateBlock v-else-if="failed" kind="error" @retry="load" />
      <StateBlock v-else-if="!games?.length" kind="empty" :message="t('myGames.empty')">
        <RouterLink to="/games/new" class="sticker-btn sticker-btn--ink"><Plus aria-hidden="true" />{{ t('games.upload') }}</RouterLink>
      </StateBlock>

      <ol v-else class="sheet">
        <li v-for="g in games" :key="g.slug" class="row">
          <RouterLink :to="{ name: 'game-edit', params: { slug: g.slug } }" class="row__link">
            <img :src="g.cover" alt="" class="row__cover" width="96" height="72" loading="lazy" />
            <span class="row__main">
              <span class="row__title" lang="zh-Hant-TW">{{ g.title }}</span>
              <span class="row__meta">
                <span class="num">{{ g.build }}</span> · {{ t('myGames.updated', { date: day(g.buildLog[0]?.date ?? g.createdAt.slice(0, 10)) }) }} ·
                /games/{{ g.slug }}
              </span>
            </span>
            <span v-if="g.hidden" class="status-chip status-chip--draft">{{ t('myGames.hidden') }}</span>
            <span v-else class="status-chip" :class="{ 'status-chip--live': g.status === 'seeking' }">{{ gameStatusLabel(g.status) }}</span>
          </RouterLink>
          <RouterLink
            v-if="!g.hidden"
            :to="{ name: 'game', params: { slug: g.slug } }"
            target="_blank"
            class="row__view"
            :aria-label="t('myGames.viewLabel', { title: g.title })"
          >
            <ExternalLink :size="18" aria-hidden="true" />
          </RouterLink>
        </li>
      </ol>
    </MemberGate>
  </div>
</template>

<style scoped>
.sheet {
  margin: clamp(32px, 5vh, 48px) 0 0;
  padding: 4px clamp(8px, 2vw, 24px);
  list-style: none;
  background: var(--card);
  box-shadow: var(--shadow-paper);
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.row + .row {
  border-top: 1px solid var(--rule);
}
.row__link {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px 20px;
  min-width: 0;
  padding: 14px 8px;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.2s;
}
.row__link:hover {
  background: rgb(255 106 43 / 0.08);
}
.row__link:focus-visible {
  outline-offset: -3px;
}
.row__cover {
  width: 96px;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  outline: 1px solid var(--rule);
  background: var(--wall);
}
.row__main {
  display: grid;
  min-width: 0;
}
.row__title {
  font-weight: 900;
  font-size: 1.125rem;
  line-height: 1.4;
}
.row__link:hover .row__title {
  text-decoration: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 3px;
  text-underline-offset: 0.2em;
}
.row__meta {
  font-size: 0.8125rem;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row__view {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  color: var(--ink);
  transition: background-color 0.2s;
}
.row__view:hover {
  background: var(--wall);
}
@media (max-width: 600px) {
  .row__link {
    grid-template-columns: 72px minmax(0, 1fr);
  }
  .row__cover {
    width: 72px;
    grid-row: span 2;
  }
  .row__link .status-chip {
    justify-self: start;
  }
}
</style>
