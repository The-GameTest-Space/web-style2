<script setup lang="ts">
import { computed } from 'vue'
import { MapPin, Clock, Repeat } from 'lucide-vue-next'
import type { GameEvent } from '@/api/types'
import { daysUntil, eventTypeLabel, isMultiDay, monthDay, time, weekday } from '@/utils/format'
import { t } from '@/i18n'
import { textLang } from '@/utils/eventText'
import DdayCounter from './DdayCounter.vue'
import OngoingMark from './OngoingMark.vue'

const props = defineProps<{ event: GameEvent }>()

const days = computed(() => (props.event.ongoing ? 0 : daysUntil(props.event.startsAt)))
const deadlineDays = computed(() => (props.event.deadline ? daysUntil(props.event.deadline.date) : null))
// A cover appears once it has loaded. One from another site can disappear:
// then the row shows nothing rather than an empty frame.
const shown = (e: Event) => (e.target as HTMLImageElement).classList.add('is-loaded')
const hideBroken = (e: Event) => ((e.target as HTMLImageElement).hidden = true)
const urgent = computed(() => deadlineDays.value !== null && deadlineDays.value >= 0 && deadlineDays.value <= 7)
</script>

<template>
  <li class="event-row">
    <RouterLink
      :to="{ name: 'event', params: { slug: event.slug } }"
      class="event-row__link"
      :class="{ 'has-cover': event.cover }"
    >
      <OngoingMark v-if="event.ongoing" class="event-row__dday" />
      <DdayCounter v-else :days="days" class="event-row__dday" />
      <div v-if="!event.ongoing" class="event-row__date">
        <span class="num event-row__md">{{ monthDay(event.startsAt) }}</span>
        <span class="event-row__wd">
          {{ t('date.weekdayParen', { wd: weekday(event.startsAt) }) }}<template v-if="isMultiDay(event.startsAt, event.endsAt)"
            >– {{ monthDay(event.endsAt!) }}</template
          >
        </span>
      </div>
      <div class="event-row__main" :class="{ 'event-row__main--wide': event.ongoing }">
        <span class="event-row__type">{{ eventTypeLabel(event.type) }}</span>
        <h3 class="event-row__title" :lang="textLang(event, 'title')">{{ event.title }}</h3>
        <p class="event-row__meta">
          <span v-if="event.ongoing" :lang="textLang(event, 'schedule')"><Repeat :size="15" aria-hidden="true" />{{ event.schedule }}</span>
          <span :lang="textLang(event, 'venue')"><MapPin :size="15" aria-hidden="true" />{{ event.city }}・{{ event.venue }}</span>
          <span v-if="!event.ongoing"><Clock :size="15" aria-hidden="true" />{{ t('event.starts', { time: time(event.startsAt) }) }}</span>
        </p>
      </div>
      <p v-if="event.deadline && deadlineDays !== null && deadlineDays >= 0" class="event-row__deadline" :class="{ 'is-urgent': urgent }">
        <span class="hand" :lang="textLang(event, 'deadlineLabel')">{{ event.deadline.label }}</span>
        <strong class="num">{{ monthDay(event.deadline.date) }}</strong>
        <span v-if="urgent" class="event-row__left">{{ t('event.daysLeft', { n: deadlineDays }) }}</span>
      </p>
      <img
        v-if="event.cover"
        :src="event.cover"
        alt=""
        class="event-row__cover"
        loading="lazy"
        @load="shown"
        @error="hideBroken"
      />
    </RouterLink>
  </li>
</template>

<style scoped>
.event-row + .event-row {
  border-top: 2px solid var(--ink);
}
.event-row__link {
  display: grid;
  grid-template-columns: 7.5rem 6.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px 24px;
  padding: 20px 8px;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.25s;
}
.event-row__link:hover {
  background: rgb(255 106 43 / 0.09);
}
.event-row__link:focus-visible {
  outline-offset: -3px;
}
.event-row__date {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.event-row__md {
  font-size: 1.5rem;
  font-weight: 800;
}
.event-row__wd {
  font-size: 0.875rem;
  color: var(--ink-3);
}
.event-row__main--wide {
  grid-column: 2 / 4;
}
.event-row__type {
  display: inline-block;
  font-size: 0.8125rem;
  font-weight: 700;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  padding: 0 9px;
  line-height: 1.6;
}
.event-row__title {
  margin-top: 6px;
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.25rem;
  line-height: 1.3;
}
.event-row__link:hover .event-row__title {
  text-decoration: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 3px;
  text-underline-offset: 0.2em;
}
.event-row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 16px;
  margin-top: 4px;
  font-size: 0.875rem;
  color: var(--ink-3);
}
.event-row__meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.event-row__deadline {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 7rem;
  padding: 8px 12px;
  text-align: center;
  line-height: 1.2;
}
.event-row__deadline .hand {
  font-size: 1rem;
}
.event-row__deadline strong {
  font-size: 1.375rem;
}
.event-row__deadline.is-urgent {
  background: var(--dot);
  border-radius: 999px / 70%;
  transform: rotate(-3deg);
}
.event-row__link.has-cover {
  grid-template-columns: 7.5rem 6.5rem minmax(0, 1fr) auto auto;
}
/* The cover as a small print pinned at the end of the row. */
.event-row__cover {
  grid-column: -2;
  width: 8rem;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 3px;
  box-shadow: var(--shadow-paper);
  rotate: 1.5deg;
  opacity: 0;
  transition:
    rotate 0.3s var(--ease-out),
    opacity 0.3s;
}
.event-row__cover.is-loaded {
  opacity: 1;
}
.event-row__link:hover .event-row__cover {
  rotate: 0deg;
}
.event-row__left {
  font-size: 0.8125rem;
  font-weight: 700;
}

@media (max-width: 760px) {
  .event-row__link {
    grid-template-columns: auto minmax(0, 1fr);
    gap: 4px 16px;
  }
  .event-row__dday {
    grid-row: span 2;
    align-self: start;
  }
  .event-row__date {
    flex-direction: row;
    align-items: baseline;
    gap: 4px;
  }
  .event-row__main,
  .event-row__main--wide {
    grid-column: 2;
  }
  /* The cover goes under the D-day, in the same column. */
  .event-row__link.has-cover {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .has-cover .event-row__dday {
    grid-row: 1;
  }
  .event-row__cover {
    grid-column: 1;
    grid-row: 2 / span 2;
    align-self: start;
    width: 5.25rem;
    margin-top: 6px;
  }
  .event-row__deadline {
    grid-column: 2;
    justify-self: start;
    flex-direction: row;
    gap: 8px;
    margin-top: 6px;
    min-width: 0;
  }
}
</style>
