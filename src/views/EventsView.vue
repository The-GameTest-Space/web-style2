<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/api/client'
import type { DatedEvent, EventType, GameEvent, ListResponse } from '@/api/types'
import { EVENT_TYPE_LABEL, daysUntil, monthLabel } from '@/utils/format'
import EventRow from '@/components/EventRow.vue'
import TapeHeading from '@/components/TapeHeading.vue'
import SampleNote from '@/components/SampleNote.vue'
import StateBlock from '@/components/StateBlock.vue'
import DiscordButton from '@/components/DiscordButton.vue'

const route = useRoute()
const router = useRouter()
const { data, error, loading, retry } = useApi<ListResponse<GameEvent>>('/api/events')

const TYPES = Object.keys(EVENT_TYPE_LABEL) as EventType[]
const type = computed(() => (TYPES.includes(route.query.type as EventType) ? (route.query.type as EventType) : null))
const onlineOnly = computed(() => route.query.online === '1')
const filtered = computed(() => !!type.value || onlineOnly.value)

const shown = computed(() =>
  (data.value?.items ?? []).filter((e) => (!type.value || e.type === type.value) && (!onlineOnly.value || e.online)),
)
// Ongoing events never expire; they sit above the months.
const ongoing = computed(() => shown.value.filter((e) => e.ongoing))
const upcoming = computed(() =>
  shown.value.filter((e): e is DatedEvent => !e.ongoing && daysUntil(e.endsAt ?? e.startsAt) >= 0),
)

const months = computed(() => {
  const groups = new Map<string, DatedEvent[]>()
  for (const e of upcoming.value) {
    const k = monthLabel(e.startsAt)
    groups.set(k, [...(groups.get(k) ?? []), e])
  }
  return [...groups.entries()]
})

const closingSoon = computed(() =>
  upcoming.value.filter((e) => e.deadline && daysUntil(e.deadline.date) >= 0 && daysUntil(e.deadline.date) <= 7).length,
)

function setQuery(patch: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, ...patch } })
}
</script>

<template>
  <div class="events shell">
    <header class="page-head">
      <TapeHeading as="h1" :tilt="1">活動資訊</TapeHeading>
      <p class="page-head__lede">
        本頁依月份整理 Game Jam、聚會、展覽、講座與線上試玩會等活動。倒數數字表示距離活動開始的天數，報名截止日另行標示。
      </p>
      <SampleNote v-if="data?.sample" text="示範資料：活動資訊整理中" />
    </header>

    <div class="filters" role="group" aria-label="篩選活動">
      <button type="button" class="filter" :aria-pressed="!type" @click="setQuery({ type: undefined })">全部</button>
      <button
        v-for="t in TYPES"
        :key="t"
        type="button"
        class="filter"
        :aria-pressed="type === t"
        @click="setQuery({ type: type === t ? undefined : t })"
      >
        {{ EVENT_TYPE_LABEL[t] }}
      </button>
      <span class="filters__sep" aria-hidden="true"></span>
      <button
        type="button"
        class="filter"
        :aria-pressed="onlineOnly"
        @click="setQuery({ online: onlineOnly ? undefined : '1' })"
      >
        僅顯示線上活動
      </button>
    </div>

    <StateBlock v-if="loading && !data" kind="loading" message="正在載入活動資訊…" />
    <StateBlock v-else-if="error" kind="error" @retry="retry" />
    <StateBlock v-else-if="!upcoming.length && !ongoing.length && !filtered" kind="empty" message="目前沒有即將舉行的活動。" />
    <StateBlock v-else-if="!upcoming.length && !ongoing.length" kind="empty" message="此分類目前沒有活動。">
      <button type="button" class="sticker-btn sticker-btn--paper" @click="router.replace({ query: {} })">查看全部活動</button>
    </StateBlock>
    <template v-else>
      <p v-if="closingSoon" class="events__alert">
        <span class="events__alert-dot" aria-hidden="true"></span>
        共有 <strong class="num">{{ closingSoon }}</strong> 個活動將於七天內截止報名
      </p>
      <section v-if="ongoing.length" class="month" aria-labelledby="ongoing-title">
        <h2 id="ongoing-title" class="month__label">長期活動</h2>
        <div class="board">
          <span class="tape tape-bit board__tape" aria-hidden="true"></span>
          <ol class="board__list">
            <EventRow v-for="e in ongoing" :key="e.slug" :event="e" />
          </ol>
        </div>
      </section>
      <section v-for="[month, items] in months" :key="month" class="month" :aria-label="month">
        <h2 class="month__label num">{{ month }}</h2>
        <div class="board">
          <span class="tape tape-bit board__tape" aria-hidden="true"></span>
          <ol class="board__list">
            <EventRow v-for="e in items" :key="e.slug" :event="e" />
          </ol>
        </div>
      </section>
    </template>

    <aside class="suggest">
      <p class="suggest__title">提供活動資訊</p>
      <p class="suggest__text">如有適合刊登的活動，請在 Discord 提供活動資訊，我們會整理後刊登於本頁。</p>
      <DiscordButton variant="ink" label="至 Discord 提供活動" />
    </aside>
  </div>
</template>

<style scoped>
.events {
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
.events__alert {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 28px;
  font-weight: 700;
}
.events__alert-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--dot);
}
.month {
  margin-top: clamp(40px, 6vh, 64px);
}
.month__label {
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}
.board {
  position: relative;
  margin-top: 20px;
  padding: 8px clamp(12px, 3vw, 36px);
  background: var(--card);
  box-shadow: var(--shadow-paper);
}
.month:nth-of-type(odd) .board {
  transform: rotate(-0.3deg);
}
.month:nth-of-type(even) .board {
  transform: rotate(0.3deg);
}
.board__tape {
  top: -11px;
  left: 50%;
  translate: -50% 0;
  rotate: -3deg;
}
.board__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.suggest {
  display: grid;
  justify-items: start;
  gap: 12px;
  margin-top: clamp(64px, 10vh, 112px);
  padding: 32px clamp(20px, 3vw, 40px);
  border: 3px dashed var(--ink);
  border-radius: 4px;
  max-width: 640px;
}
.suggest__title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.5rem;
}
.suggest__text {
  color: var(--ink-2);
}
@media (max-width: 640px) {
  .filters__sep {
    display: none;
  }
}
</style>
