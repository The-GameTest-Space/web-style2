<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { ArrowLeft, CalendarPlus, ExternalLink } from 'lucide-vue-next'
import { useApi, NotFoundError } from '@/api/client'
import type { GameEvent, ItemResponse } from '@/api/types'
import { daysUntil, eventTypeLabel, fullDate, isMultiDay, monthDay, pageTitle, time } from '@/utils/format'
import { safeHtml } from '@/utils/html'
import DdayCounter from '@/components/DdayCounter.vue'
import OngoingMark from '@/components/OngoingMark.vue'
import DiscordButton from '@/components/DiscordButton.vue'
import StateBlock from '@/components/StateBlock.vue'
import I18nT from '@/components/I18nT.vue'
import { t } from '@/i18n'

const props = defineProps<{ slug: string }>()
const { data, error, loading, retry } = useApi<ItemResponse<GameEvent>>(() => `/api/events/${props.slug}`)

const ev = computed(() => data.value?.item)
const days = computed(() => (ev.value?.startsAt ? daysUntil(ev.value.startsAt) : 0))
const descriptionHtml = computed(() => (ev.value?.description ? safeHtml(ev.value.description) : ''))
const deadlineDays = computed(() => (ev.value?.deadline ? daysUntil(ev.value.deadline.date) : null))

watchEffect(() => {
  if (ev.value) document.title = pageTitle(ev.value.title)
})

function icsStamp(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// A calendar file the visitor saves on click; nothing leaves the browser.
function downloadIcs() {
  const e = ev.value
  if (!e || e.ongoing) return
  const end = e.endsAt ?? new Date(new Date(e.startsAt).getTime() + 2 * 3600_000).toISOString()
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Game Test Space//Events//ZH',
    'BEGIN:VEVENT',
    `UID:${e.slug}@gtspace`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(e.startsAt)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${e.title}`,
    `LOCATION:${e.city} ${e.venue}`,
    `DESCRIPTION:${e.summary}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${e.slug}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="ev shell">
    <RouterLink to="/events" class="back"><ArrowLeft :size="18" aria-hidden="true" />{{ t('event.back') }}</RouterLink>

    <StateBlock v-if="loading && !data" kind="loading" :message="t('events.loading')" />
    <StateBlock v-else-if="error && error instanceof NotFoundError" kind="missing" :message="t('event.missing')">
      <RouterLink to="/events" class="sticker-btn sticker-btn--paper">{{ t('event.browse') }}</RouterLink>
    </StateBlock>
    <StateBlock v-else-if="error" kind="error" @retry="retry" />

    <article v-else-if="ev" class="poster">
      <span class="tape tape-bit poster__tape poster__tape--l" aria-hidden="true"></span>
      <span class="tape tape-bit poster__tape poster__tape--r" aria-hidden="true"></span>

      <img
        v-if="ev.cover"
        :src="ev.cover"
        :alt="t('event.coverAlt', { title: ev.title })"
        class="poster__cover"
        @load="($event.target as HTMLImageElement).classList.add('is-loaded')"
        @error="($event.target as HTMLImageElement).hidden = true"
      />
      <header class="poster__head">
        <div class="poster__count">
          <template v-if="ev.ongoing">
            <OngoingMark size="lg" />
            <p class="poster__count-label">{{ ev.startsAt && days > 0 ? t('event.from', { date: monthDay(ev.startsAt) }) : t('event.running') }}</p>
          </template>
          <template v-else>
            <DdayCounter :days="days" size="lg" />
            <p class="poster__count-label">
              {{ days > 0 ? t('event.daysToGo', { n: days }) : days === 0 ? t('event.today') : t('event.started') }}
            </p>
          </template>
        </div>
        <div class="poster__titles">
          <p class="poster__type">{{ eventTypeLabel(ev.type) }}<span v-if="ev.online"> · {{ t('event.online') }}</span></p>
          <h1 class="poster__title" lang="zh-Hant-TW">{{ ev.title }}</h1>
          <p class="poster__summary" lang="zh-Hant-TW">{{ ev.summary }}</p>
          <p v-if="data?.sample" class="poster__sample hand">{{ t('event.sample') }}</p>
        </div>
      </header>

      <dl class="poster__facts">
        <div>
          <dt>{{ t('event.date') }}</dt>
          <dd v-if="ev.ongoing">
            {{ t('event.longRunning') }}<template v-if="ev.startsAt"><br />{{ t('event.since', { date: fullDate(ev.startsAt) }) }}</template>
          </dd>
          <dd v-else>
            {{ fullDate(ev.startsAt) }}
            <template v-if="isMultiDay(ev.startsAt, ev.endsAt)"><br />{{ t('event.until', { date: fullDate(ev.endsAt!) }) }}</template>
          </dd>
        </div>
        <div>
          <dt>{{ t('event.time') }}</dt>
          <dd v-if="ev.ongoing" lang="zh-Hant-TW">{{ ev.schedule }}</dd>
          <dd v-else-if="ev.endsAt && isMultiDay(ev.startsAt, ev.endsAt)">
            {{ t('event.starts', { time: time(ev.startsAt) }) }}<br />{{ t('event.ends', { date: monthDay(ev.endsAt), time: time(ev.endsAt) }) }}
          </dd>
          <dd v-else class="num">{{ time(ev.startsAt) }}<template v-if="ev.endsAt"> – {{ time(ev.endsAt) }}</template></dd>
        </div>
        <div>
          <dt>{{ t('event.place') }}</dt>
          <dd lang="zh-Hant-TW">{{ ev.city }}<br />{{ ev.venue }}</dd>
        </div>
        <div>
          <dt>{{ t('event.fee') }}</dt>
          <dd lang="zh-Hant-TW">{{ ev.fee }}</dd>
        </div>
      </dl>

      <div class="poster__body">
        <div class="poster__text">
          <div v-if="descriptionHtml" class="prose" lang="zh-Hant-TW" v-html="descriptionHtml"></div>

          <section v-if="ev.agenda?.length" class="agenda" aria-labelledby="agenda-title">
            <h2 id="agenda-title" class="poster__h2">{{ t('event.agenda') }}</h2>
            <ol class="agenda__list" lang="zh-Hant-TW">
              <li v-for="a in ev.agenda" :key="a.time + a.item">
                <span class="agenda__time num">{{ a.time }}</span>
                <span>{{ a.item }}</span>
              </li>
            </ol>
          </section>

          <section class="audience" aria-labelledby="aud-title">
            <h2 id="aud-title" class="poster__h2">{{ t('event.audience') }}</h2>
            <ul class="audience__list" lang="zh-Hant-TW">
              <li v-for="a in ev.audience" :key="a">{{ a }}</li>
            </ul>
          </section>
        </div>

        <aside class="poster__side">
          <div v-if="ev.deadline && deadlineDays !== null" class="deadline" :class="{ 'is-past': deadlineDays < 0 }">
            <p class="deadline__label hand" lang="zh-Hant-TW">{{ ev.deadline.label }}</p>
            <p class="deadline__date num">{{ monthDay(ev.deadline.date) }}</p>
            <p class="deadline__left">
              {{ deadlineDays > 0 ? t('event.daysLeft', { n: deadlineDays }) : deadlineDays === 0 ? t('event.closesToday') : t('event.closed') }}
            </p>
          </div>
          <a v-if="ev.url" :href="ev.url" target="_blank" rel="noopener" class="sticker-btn sticker-btn--ink poster__cta">
            <ExternalLink aria-hidden="true" />{{ t('event.visit') }}<span class="visually-hidden">{{ t('common.newTab') }}</span>
          </a>
          <DiscordButton :variant="ev.url ? 'paper' : undefined" :label="t('event.findCompany')" class="poster__cta" />
          <button v-if="!ev.ongoing" type="button" class="poster__cal" @click="downloadIcs">
            <CalendarPlus :size="20" aria-hidden="true" />{{ t('event.ics') }}
          </button>
          <p v-if="data?.sample" class="poster__fine">{{ t('event.sampleNote') }}</p>
        </aside>
      </div>
    </article>
  </div>
</template>

<style scoped>
.ev {
  padding-top: clamp(24px, 4vh, 40px);
  padding-bottom: clamp(88px, 14vh, 160px);
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  font-weight: 700;
  text-decoration: none;
}
.back:hover {
  text-decoration: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 3px;
}
.poster {
  position: relative;
  margin-top: 28px;
  padding: clamp(28px, 5vw, 64px);
  background: var(--card);
  box-shadow: var(--shadow-lift);
  transform: rotate(-0.4deg);
}
.poster__tape {
  top: -12px;
  width: 110px;
  height: 26px;
}
.poster__tape--l {
  left: 8%;
  rotate: -6deg;
}
.poster__tape--r {
  right: 8%;
  rotate: 5deg;
}
.poster__cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  margin-bottom: clamp(24px, 4vh, 40px);
  object-fit: cover;
  box-shadow: var(--shadow-paper);
  opacity: 0;
  transition: opacity 0.3s;
}
.poster__cover.is-loaded {
  opacity: 1;
}
.poster__head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 24px clamp(28px, 5vw, 64px);
  align-items: end;
  padding-bottom: clamp(24px, 4vh, 40px);
  border-bottom: 4px solid var(--ink);
}
.poster__count-label {
  margin-top: 4px;
  font-weight: 700;
}
.poster__type {
  display: inline-block;
  padding: 2px 12px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 700;
}
.poster__title {
  margin-top: 14px;
  font-family: var(--font-body);
  font-weight: 900;
  font-size: clamp(2.25rem, 5vw, 4.25rem);
  letter-spacing: -0.03em;
  line-height: 1.08;
}
.poster__summary {
  margin-top: 16px;
  font-size: 1.1875rem;
  line-height: 1.65;
  max-width: 34em;
  color: var(--ink-2);
}
.poster__sample {
  margin-top: 12px;
  font-size: 1.0625rem;
  text-decoration: underline wavy var(--dot);
  text-decoration-thickness: 2px;
  text-underline-offset: 0.3em;
}
.poster__facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  border-bottom: 2px solid var(--ink);
}
.poster__facts div {
  padding: 20px 16px 20px 0;
}
.poster__facts div + div {
  padding-left: 20px;
  border-left: 1px solid var(--rule);
}
.poster__facts dt {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--ink-3);
}
.poster__facts dd {
  margin: 4px 0 0;
  font-weight: 700;
  line-height: 1.5;
  text-wrap: pretty;
}
.poster__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 40px clamp(32px, 5vw, 72px);
  margin-top: clamp(28px, 5vh, 48px);
  align-items: start;
}
.poster__h2 {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.375rem;
  padding-bottom: 8px;
  border-bottom: 3px solid var(--ink);
}
.agenda,
.audience {
  margin-top: 40px;
}
.agenda__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.agenda__list li {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--rule);
}
.agenda__time {
  font-weight: 800;
}
.audience__list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.audience__list li {
  padding: 6px 14px;
  background: var(--wall);
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.9375rem;
}
.poster__side {
  position: sticky;
  top: 100px;
  display: grid;
  gap: 14px;
}
.deadline {
  display: grid;
  justify-items: center;
  padding: 24px 16px;
  margin-bottom: 8px;
  background: var(--dot);
  border-radius: 50% 48% 52% 46% / 46% 52% 48% 50%;
  transform: rotate(-3deg);
  text-align: center;
  line-height: 1.2;
}
.deadline.is-past {
  background: var(--wall);
}
.deadline__label {
  font-size: 1.25rem;
}
.deadline__date {
  font-size: 2.75rem;
  font-weight: 800;
}
.deadline__left {
  font-weight: 700;
}
.poster__cta {
  justify-content: center;
}
.poster__cal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: var(--card);
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s;
}
.poster__cal:hover {
  background: var(--wall);
}
.poster__fine {
  font-size: 0.8125rem;
  color: var(--ink-3);
}
@media (max-width: 900px) {
  .poster__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .poster__facts div:nth-child(3) {
    padding-left: 0;
    border-left: 0;
  }
  .poster__facts div:nth-child(n + 3) {
    border-top: 1px solid var(--rule);
  }
  .poster__body {
    grid-template-columns: 1fr;
  }
  .poster__side {
    position: static;
    grid-row: 1;
  }
}
@media (max-width: 600px) {
  .poster {
    transform: none;
    margin-inline: -4px;
  }
  .poster__head {
    grid-template-columns: 1fr;
  }
  .agenda__list li {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
