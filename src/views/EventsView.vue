<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, X } from 'lucide-vue-next'
import { useApi } from '@/api/client'
import type { Country, DatedEvent, EventType, GameEvent, ListResponse } from '@/api/types'
import { EVENT_TYPE_LABEL, daysUntil, monthLabel } from '@/utils/format'
import { COUNTRIES, COUNTRY_LABEL, countryOf } from '@/utils/country'
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
// ?country=jp; lower case in the URL, ISO code in the data.
const country = computed(() => {
  const c = typeof route.query.country === 'string' ? route.query.country.toUpperCase() : ''
  return COUNTRIES.includes(c as Country) ? (c as Country) : null
})
// Only countries that have events get a button.
const countries = computed(() => COUNTRIES.filter((c) => (data.value?.items ?? []).some((e) => countryOf(e) === c)))

// The search box follows ?q= so a search can be shared and survives going back.
// v-model waits for IME composition to end, so half-typed 注音 doesn't filter.
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
watch(q, (v) => setQuery({ q: v || undefined }))
watch(
  () => route.query.q,
  (v) => {
    const s = typeof v === 'string' ? v : ''
    if (s !== q.value) q.value = s
  },
)
const norm = (s: string) => s.normalize('NFKC').toLowerCase()
const terms = computed(() => norm(q.value).split(/\s+/).filter(Boolean))
const searchable = (e: GameEvent) =>
  norm(
    [
      e.title,
      e.summary,
      EVENT_TYPE_LABEL[e.type],
      COUNTRY_LABEL[countryOf(e)],
      e.city,
      e.venue,
      e.fee,
      e.schedule ?? '',
      ...e.audience,
      (e.description ?? '').replace(/<[^>]*>/g, ' '),
    ].join(' '),
  )

const filtered = computed(() => !!type.value || !!country.value || onlineOnly.value || terms.value.length > 0)

const shown = computed(() =>
  (data.value?.items ?? []).filter((e) => {
    if ((type.value && e.type !== type.value) || (onlineOnly.value && !e.online)) return false
    if (country.value && countryOf(e) !== country.value) return false
    if (!terms.value.length) return true
    const text = searchable(e)
    return terms.value.every((t) => text.includes(t))
  }),
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

const resultCount = computed(() => ongoing.value.length + upcoming.value.length)

const closingSoon = computed(() =>
  upcoming.value.filter((e) => e.deadline && daysUntil(e.deadline.date) >= 0 && daysUntil(e.deadline.date) <= 7).length,
)

function setQuery(patch: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, ...patch } })
}

// The search runs as you type; the keyboard's search key only closes the keyboard.
function onSearchSubmit(e: Event) {
  ;(e.target as HTMLFormElement).querySelector('input')?.blur()
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

    <form class="search" role="search" @submit.prevent="onSearchSubmit">
      <label for="event-search" class="visually-hidden">搜尋活動</label>
      <Search class="search__icon" :size="20" aria-hidden="true" />
      <input
        id="event-search"
        v-model="q"
        type="search"
        class="search__input"
        placeholder="搜尋活動名稱、地點或內容"
        autocomplete="off"
        enterkeyhint="search"
      />
      <button v-if="q" type="button" class="search__clear" aria-label="清除搜尋" @click="q = ''">
        <X :size="18" aria-hidden="true" />
      </button>
    </form>
    <!-- Announces the number of results as the search changes. -->
    <p class="visually-hidden" aria-live="polite">{{ terms.length && data ? `找到 ${resultCount} 個活動` : '' }}</p>

    <div class="filters" role="group" aria-label="依類型篩選活動">
      <span class="filters__label" aria-hidden="true">類型</span>
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
    <div v-if="countries.length > 1" class="filters" role="group" aria-label="依國家篩選活動">
      <span class="filters__label" aria-hidden="true">國家</span>
      <button type="button" class="filter" :aria-pressed="!country" @click="setQuery({ country: undefined })">全部</button>
      <button
        v-for="c in countries"
        :key="c"
        type="button"
        class="filter"
        :aria-pressed="country === c"
        @click="setQuery({ country: country === c ? undefined : c.toLowerCase() })"
      >
        {{ COUNTRY_LABEL[c] }}
      </button>
    </div>

    <StateBlock v-if="loading && !data" kind="loading" message="正在載入活動資訊…" />
    <StateBlock v-else-if="error" kind="error" @retry="retry" />
    <StateBlock v-else-if="!upcoming.length && !ongoing.length && !filtered" kind="empty" message="目前沒有即將舉行的活動。" />
    <StateBlock
      v-else-if="!upcoming.length && !ongoing.length"
      kind="empty"
      :message="terms.length ? `找不到符合「${q.trim()}」的活動。` : '此分類目前沒有活動。'"
    >
      <button type="button" class="sticker-btn sticker-btn--paper" @click="router.replace({ query: {} })">
        {{ terms.length ? '清除搜尋與篩選' : '查看全部活動' }}
      </button>
    </StateBlock>
    <template v-else>
      <p v-if="terms.length" class="events__count">
        找到 <strong class="num">{{ resultCount }}</strong> 個符合「{{ q.trim() }}」的活動
      </p>
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
.search {
  position: relative;
  display: flex;
  align-items: center;
  width: min(100%, 440px);
  margin-top: clamp(32px, 5vh, 48px);
}
.search__icon {
  position: absolute;
  left: 18px;
  color: var(--ink-2);
  pointer-events: none;
}
.search__input {
  width: 100%;
  min-height: 48px;
  padding: 0 52px 0 48px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: var(--card);
  font: inherit;
  color: var(--ink);
  appearance: none;
}
.search__input::placeholder {
  color: var(--ink-3);
}
/* The clear button below replaces the browser's own. */
.search__input::-webkit-search-cancel-button {
  appearance: none;
}
.search__input:focus-visible {
  border-radius: 999px;
}
.search__clear {
  position: absolute;
  right: 4px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: none;
  cursor: pointer;
  transition: background-color 0.2s;
}
.search__clear:hover {
  background: var(--wall);
}
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}
.filters + .filters {
  margin-top: 10px;
}
.filters__label {
  min-width: 2.5em;
  font-size: 0.875rem;
  font-weight: 800;
  color: var(--ink-3);
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
.events__count {
  margin-top: 28px;
  font-weight: 700;
}
.events__count + .events__alert {
  margin-top: 8px;
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
/* On wide screens the suggest box sits beside the page heading; below this
   it stays at the end of the list, where it is in the markup. */
@media (min-width: 1081px) {
  .events {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 400px;
    column-gap: 48px;
    align-content: start;
  }
  .events > * {
    grid-column: 1 / -1;
  }
  .events > .page-head {
    grid-column: 1;
    grid-row: 1;
  }
  .events > .suggest {
    grid-column: 2;
    grid-row: 1;
    align-self: end;
    margin-top: 0;
    max-width: none;
  }
}
@media (max-width: 640px) {
  .filters__sep {
    display: none;
  }
}
</style>
