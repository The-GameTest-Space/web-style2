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
      <TapeHeading as="h1" :tilt="-1.2">遊戲作品</TapeHeading>
      <p class="page-head__lede">
        本頁列出社群成員正在開發的遊戲。每張卡片載明開發者最希望了解的問題，橘色圓點代表已試玩過的人數。
      </p>
      <SampleNote v-if="data?.sample" />
    </header>

    <div v-if="!data || all.length" class="filters" role="group" aria-label="篩選遊戲">
      <button
        type="button"
        class="filter filter--seeking"
        :aria-pressed="seekingOnly"
        @click="setQuery({ seeking: seekingOnly ? undefined : '1' })"
      >
        <span class="filter__dot" aria-hidden="true"></span>僅顯示徵求測試中
      </button>
      <span class="filters__sep" aria-hidden="true"></span>
      <button type="button" class="filter" :aria-pressed="!genre" @click="setQuery({ genre: undefined })">全部類型</button>
      <button
        v-for="g in genres"
        :key="g"
        type="button"
        class="filter"
        :aria-pressed="genre === g"
        @click="toggleGenre(g)"
      >
        {{ g }}
      </button>
    </div>

    <StateBlock v-if="loading && !data" kind="loading" />
    <StateBlock v-else-if="error" kind="error" @retry="retry" />
    <StateBlock v-else-if="!all.length" kind="empty" message="還沒有刊登的遊戲。尚未完成的遊戲也可以，請至 Discord 發布遊戲的 build。">
      <DiscordButton variant="ink" label="至 Discord 發布 build" />
    </StateBlock>
    <StateBlock v-else-if="!shown.length" kind="empty" message="目前沒有符合篩選條件的遊戲，請選擇其他類型。">
      <button type="button" class="sticker-btn sticker-btn--paper" @click="router.replace({ query: {} })">清除篩選</button>
    </StateBlock>
    <template v-else>
      <p class="games__count" aria-live="polite">目前共有 <strong class="num">{{ shown.length }}</strong> 款遊戲</p>
      <div class="games__grid">
        <GameCard v-for="(g, i) in shown" :key="g.slug" :game="g" :order="i" class="games__card" />
        <aside class="games__slot">
          <p class="games__slot-title">您的遊戲也可以在此展示。</p>
          <p class="games__slot-text">尚未完成的遊戲同樣適用，只要能夠執行即可。請至 Discord 發布遊戲的 build。</p>
          <DiscordButton variant="ink" label="至 Discord 發布 build" />
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
