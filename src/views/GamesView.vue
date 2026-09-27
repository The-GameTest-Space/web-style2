<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/api/client'
import type { Game, ListResponse } from '@/api/types'
import GameCard from '@/components/GameCard.vue'
import TapeHeading from '@/components/TapeHeading.vue'
import SampleNote from '@/components/SampleNote.vue'
import StateBlock from '@/components/StateBlock.vue'
import DiscordButton from '@/components/DiscordButton.vue'
import I18nT from '@/components/I18nT.vue'
import { t } from '@/i18n'

const route = useRoute()
const router = useRouter()
const { data, error, loading, retry } = useApi<ListResponse<Game>>('/api/games')

const all = computed(() => data.value?.items ?? [])
const genres = computed(() => [...new Set(all.value.flatMap((g) => g.genres))])

// Filters live in the URL so a filtered wall can be shared in Discord.
const genre = computed(() => (typeof route.query.genre === 'string' ? route.query.genre : ''))
const seekingOnly = computed(() => route.query.seeking === '1')

const shown = computed(() =>
  all.value.filter(
    (g) => (!genre.value || g.genres.includes(genre.value)) && (!seekingOnly.value || g.status === 'seeking'),
  ),
)

function setQuery(patch: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, ...patch } })
}
function toggleGenre(g: string) {
  setQuery({ genre: genre.value === g ? undefined : g })
}
</script>

<template>
  <div class="games shell">
    <header class="page-head">
      <TapeHeading as="h1" :tilt="-1.2">{{ t('games.title') }}</TapeHeading>
      <p class="page-head__lede">{{ t('games.lede') }}</p>
      <SampleNote v-if="data?.sample" />
    </header>

    <div v-if="!data || all.length" class="filters" role="group" :aria-label="t('games.filters')">
      <button
        type="button"
        class="filter filter--seeking"
        :aria-pressed="seekingOnly"
        @click="setQuery({ seeking: seekingOnly ? undefined : '1' })"
      >
        <span class="filter__dot" aria-hidden="true"></span>{{ t('games.seekingOnly') }}
      </button>
      <span class="filters__sep" aria-hidden="true"></span>
      <button type="button" class="filter" :aria-pressed="!genre" @click="setQuery({ genre: undefined })">{{ t('games.allGenres') }}</button>
      <button
        v-for="g in genres"
        :key="g"
        type="button"
        class="filter"
        :aria-pressed="genre === g"
        @click="toggleGenre(g)"
      >
        <span lang="zh-Hant-TW">{{ g }}</span>
      </button>
    </div>

    <StateBlock v-if="loading && !data" kind="loading" />
    <StateBlock v-else-if="error" kind="error" @retry="retry" />
    <StateBlock v-else-if="!all.length" kind="empty" :message="t('games.empty')">
      <DiscordButton variant="ink" :label="t('games.postBuild')" />
    </StateBlock>
    <StateBlock v-else-if="!shown.length" kind="empty" :message="t('games.noMatch')">
      <button type="button" class="sticker-btn sticker-btn--paper" @click="router.replace({ query: {} })">{{ t('common.clearFilters') }}</button>
    </StateBlock>
    <template v-else>
      <p class="games__count" aria-live="polite">
        <I18nT k="games.count" :n="shown.length"><template #n><strong class="num">{{ shown.length }}</strong></template></I18nT>
      </p>
      <div class="games__grid">
        <GameCard v-for="(g, i) in shown" :key="g.slug" :game="g" :order="i" class="games__card" />
        <aside class="games__slot">
          <p class="games__slot-title">{{ t('games.slotTitle') }}</p>
          <p class="games__slot-text">{{ t('games.slotText') }}</p>
          <DiscordButton variant="ink" :label="t('games.postBuild')" />
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.games {
  padding-top: clamp(32px, 6vh, 64px);
  padding-bottom: clamp(88px, 14vh, 160px);
}
.page-head {
  display: grid;
  justify-items: start;
  gap: 20px;
}
.page-head :deep(h1) {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
}
.page-head__lede {
  max-width: 38em;
  font-size: 1.125rem;
  color: var(--ink-2);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: clamp(32px, 5vh, 48px);
}
.filters__sep {
  width: 2px;
  height: 28px;
  background: var(--ink);
  margin-inline: 6px;
  border-radius: 2px;
}
.filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: transparent;
  font-weight: 700;
  font-size: 0.9375rem;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s,
    transform 0.3s var(--ease-out);
}
.filter:hover {
  background: var(--card);
  transform: translateY(-1px);
}
.filter[aria-pressed='true'] {
  background: var(--ink);
  color: var(--card);
}
.filter__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--dot);
}
.filter--seeking[aria-pressed='true'] {
  background: var(--dot);
  color: var(--ink);
  border-color: var(--dot);
}
.filter--seeking[aria-pressed='true'] .filter__dot {
  background: var(--ink);
  border-color: var(--ink);
}

.games__count {
  margin-top: 28px;
  font-size: 0.9375rem;
  color: var(--ink-2);
}
.games__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr));
  gap: 56px clamp(24px, 3vw, 48px);
  margin-top: 40px;
  align-items: start;
}
.games__card:nth-child(4n + 2) {
  margin-top: 36px;
}
.games__card:nth-child(4n + 3) {
  margin-top: 12px;
}
.games__slot {
  display: grid;
  gap: 14px;
  align-content: start;
  justify-items: start;
  min-height: 360px;
  padding: 28px 24px;
  border: 3px dashed var(--ink);
  border-radius: 4px;
}
.games__slot-title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.5rem;
  line-height: 1.25;
}
.games__slot-text {
  color: var(--ink-2);
}
@media (max-width: 640px) {
  .games__card:nth-child(n) {
    margin-top: 0;
  }
  .filters__sep {
    display: none;
  }
}
</style>
