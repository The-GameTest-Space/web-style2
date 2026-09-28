<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, X } from 'lucide-vue-next'
import { useApi } from '@/api/client'
import type { Country, DatedEvent, EventType, GameEvent, ListResponse } from '@/api/types'
import { EVENT_TYPES, daysUntil, eventTypeLabel, monthLabel } from '@/utils/format'
import { COUNTRIES, countryLabel, countryOf } from '@/utils/country'
import EventRow from '@/components/EventRow.vue'
import FilterSelect from '@/components/FilterSelect.vue'
import TapeHeading from '@/components/TapeHeading.vue'
import SampleNote from '@/components/SampleNote.vue'
import StateBlock from '@/components/StateBlock.vue'
import DiscordButton from '@/components/DiscordButton.vue'
import I18nT from '@/components/I18nT.vue'
import { locale, t } from '@/i18n'
import { withLang } from '@/i18n/locales'

const route = useRoute()
const router = useRouter()
const { data, error, loading, retry } = useApi<ListResponse<GameEvent>>(withLang('/api/events', locale))

const type = computed(() =>
  EVENT_TYPES.includes(route.query.type as EventType) ? (route.query.type as EventType) : null,
)
const onlineOnly = computed(() => route.query.online === '1')
// ?country=jp; lower case in the URL, upper case (JP, STEAM) in the data.
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
      eventTypeLabel(e.type),
      countryLabel(countryOf(e)),
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

// On phones each row of chips is a dropdown instead.
const typeModel = computed({
  get: () => type.value ?? '',
  set: (v: string) => setQuery({ type: v || undefined }),
})
const typeOptions = computed(() => [
  { value: '', label: t('common.all') },
  ...EVENT_TYPES.map((et) => ({ value: et, label: eventTypeLabel(et) })),
])
const countryModel = computed({
  get: () => country.value?.toLowerCase() ?? '',
  set: (v: string) => setQuery({ country: v || undefined }),
})
const countryOptions = computed(() => [
  { value: '', label: t('common.all') },
  ...countries.value.map((c) => ({ value: c.toLowerCase(), label: countryLabel(c) })),
])

// The search runs as you type; the keyboard's search key only closes the keyboard.
function onSearchSubmit(e: Event) {
  ;(e.target as HTMLFormElement).querySelector('input')?.blur()
}
</script>

<template>
  <div class="events shell">
    <header class="page-head">
      <TapeHeading as="h1" :tilt="1">{{ t('events.title') }}</TapeHeading>
      <p class="page-head__lede">{{ t('events.lede') }}</p>
      <SampleNote v-if="data?.sample" :text="t('sample.events')" />
    </header>

    <form class="search" role="search" @submit.prevent="onSearchSubmit">
      <label for="event-search" class="visually-hidden">{{ t('events.search') }}</label>
      <Search class="search__icon" :size="20" aria-hidden="true" />
      <input
        id="event-search"
        v-model="q"
        type="search"
        class="search__input"
        :placeholder="t('events.searchPlaceholder')"
        autocomplete="off"
        enterkeyhint="search"
      />
      <button v-if="q" type="button" class="search__clear" :aria-label="t('events.clearSearch')" @click="q = ''">
        <X :size="18" aria-hidden="true" />
      </button>
    </form>
    <!-- Announces the number of results as the search changes. -->
    <p class="visually-hidden" aria-live="polite">{{ terms.length && data ? t('events.found', { n: resultCount }) : '' }}</p>

    <div class="filterbar">
      <div class="filters" role="group" :aria-label="t('events.byType')">
        <span class="filters__label" aria-hidden="true">{{ t('events.type') }}</span>
        <FilterSelect v-model="typeModel" class="filters__pick" :label="t('events.type')" :options="typeOptions" />
        <button type="button" class="filter" :aria-pressed="!type" @click="setQuery({ type: undefined })">{{ t('common.all') }}</button>
        <button
          v-for="et in EVENT_TYPES"
          :key="et"
          type="button"
          class="filter"
          :aria-pressed="type === et"
          @click="setQuery({ type: type === et ? undefined : et })"
        >
          {{ eventTypeLabel(et) }}
        </button>
        <span class="filters__sep" aria-hidden="true"></span>
        <button
          type="button"
          class="filter filter--toggle"
          :aria-pressed="onlineOnly"
          @click="setQuery({ online: onlineOnly ? undefined : '1' })"
        >
          {{ t('events.onlineOnly') }}
        </button>
      </div>
      <div v-if="countries.length > 1" class="filters" role="group" :aria-label="t('events.byCountry')">
        <span class="filters__label" aria-hidden="true">{{ t('events.country') }}</span>
        <FilterSelect v-model="countryModel" class="filters__pick" :label="t('events.country')" :options="countryOptions" />
        <button type="button" class="filter" :aria-pressed="!country" @click="setQuery({ country: undefined })">{{ t('common.all') }}</button>
        <button
          v-for="c in countries"
          :key="c"
          type="button"
          class="filter"
          :aria-pressed="country === c"
          @click="setQuery({ country: country === c ? undefined : c.toLowerCase() })"
        >
          {{ countryLabel(c) }}
        </button>
      </div>
    </div>

    <StateBlock v-if="loading && !data" kind="loading" :message="t('events.loading')" />
    <StateBlock v-else-if="error" kind="error" @retry="retry" />
    <StateBlock v-else-if="!upcoming.length && !ongoing.length && !filtered" kind="empty" :message="t('events.none')" />
    <StateBlock
      v-else-if="!upcoming.length && !ongoing.length"
      kind="empty"
      :message="terms.length ? t('events.noMatchSearch', { q: q.trim() }) : t('events.noMatchFilter')"
    >
      <button type="button" class="sticker-btn sticker-btn--paper" @click="router.replace({ query: {} })">
        {{ terms.length ? t('events.clearAll') : t('events.viewAll') }}
      </button>
    </StateBlock>
    <template v-else>
      <p v-if="terms.length" class="events__count">
        <I18nT k="events.foundFor" :n="resultCount">
          <template #n><strong class="num">{{ resultCount }}</strong></template>
          <template #q>{{ q.trim() }}</template>
        </I18nT>
      </p>
      <p v-if="closingSoon" class="events__alert">
        <span class="events__alert-dot" aria-hidden="true"></span>
        <I18nT k="events.closingSoon" :n="closingSoon"><template #n><strong class="num">{{ closingSoon }}</strong></template></I18nT>
      </p>
      <section v-if="ongoing.length" class="month" aria-labelledby="ongoing-title">
        <h2 id="ongoing-title" class="month__label">{{ t('events.ongoing') }}</h2>
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
      <p class="suggest__title">{{ t('events.suggestTitle') }}</p>
      <p class="suggest__text">{{ t('events.suggestText') }}</p>
      <DiscordButton variant="ink" :label="t('events.suggestCta')" />
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
/* Phones only, below. */
.filters .filters__pick {
  display: none;
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
/* From tablet width the suggest box sits beside the page heading; below this
   it stays at the end of the list, where it is in the markup. */
@media (min-width: 761px) {
  .events {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    column-gap: 32px;
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
@media (min-width: 1081px) {
  .events {
    grid-template-columns: minmax(0, 1fr) 400px;
    column-gap: 48px;
  }
}
@media (max-width: 640px) {
  .filters__sep {
    display: none;
  }
  /* Each row's chips become one dropdown beside its label; the rows share
     the label column, so the dropdowns line up whatever the labels' length.
     The online switch is yes or no, not one of many, so it stays a chip,
     under the type dropdown. */
  .filterbar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 12px;
  }
  .filters {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    column-gap: 12px;
  }
  .filter:not(.filter--toggle) {
    display: none;
  }
  .filters .filters__pick {
    display: block;
  }
  .filter--toggle {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
