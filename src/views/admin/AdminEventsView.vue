<script setup lang="ts">
import { computed, ref } from 'vue'
import { ExternalLink, Plus } from 'lucide-vue-next'
import { adminApi } from '@/api/admin'
import type { AdminEvent } from '@/api/types'
import { EVENT_TYPE_LABEL, daysUntil, monthDay, weekday } from '@/utils/format'
import StateBlock from '@/components/StateBlock.vue'
import TapeHeading from '@/components/TapeHeading.vue'

const events = ref<AdminEvent[] | null>(null)
const failed = ref(false)

async function load() {
  failed.value = false
  try {
    events.value = (await adminApi.events()).items
  } catch (e) {
    console.error(e)
    failed.value = true
  }
}
load()

// Set by the edit page after a delete (router state, gone on reload).
const flash = typeof history.state?.flash === 'string' ? (history.state.flash as string) : ''

const isPast = (e: AdminEvent) => daysUntil(e.endsAt ?? e.startsAt) < 0

const groups = computed(() => {
  const all = events.value ?? []
  return [
    { key: 'draft', label: '草稿', hint: '尚未發布，不會出現在公開頁面。', items: all.filter((e) => !e.published) },
    { key: 'live', label: '已發布', hint: '顯示在活動資訊頁，依開始時間排列。', items: all.filter((e) => e.published && !isPast(e)) },
    {
      key: 'past',
      label: '已結束',
      hint: '仍可透過網址查看，但不再列於活動資訊頁。',
      items: all.filter((e) => e.published && isPast(e)).reverse(),
    },
  ].filter((g) => g.items.length)
})

const year = (iso: string) => new Date(iso).getFullYear()
</script>

<template>
  <header class="admin-head">
    <div>
      <TapeHeading as="h1" :tilt="-1">活動管理</TapeHeading>
      <p class="admin-head__lede">新增、編輯與發布活動。草稿只有管理員看得到，發布後才會出現在活動資訊頁。</p>
    </div>
    <RouterLink :to="{ name: 'admin-event-new' }" class="sticker-btn sticker-btn--ink">
      <Plus aria-hidden="true" />新增活動
    </RouterLink>
  </header>
  <p v-if="flash" class="admin-flash" role="status">{{ flash }}</p>

  <StateBlock v-if="!events && !failed" kind="loading" message="正在載入活動…" />
  <StateBlock v-else-if="failed" kind="error" @retry="load" />
  <StateBlock v-else-if="!groups.length" kind="empty" message="還沒有任何活動，新增第一個活動吧。">
    <RouterLink :to="{ name: 'admin-event-new' }" class="sticker-btn sticker-btn--ink"><Plus aria-hidden="true" />新增活動</RouterLink>
  </StateBlock>

  <section v-for="g in groups" :key="g.key" class="group" :aria-labelledby="`group-${g.key}`">
    <div class="group__head">
      <h2 :id="`group-${g.key}`" class="group__title">
        {{ g.label }}<span class="group__count num">{{ g.items.length }}</span>
      </h2>
      <p class="group__hint">{{ g.hint }}</p>
    </div>
    <ol class="sheet">
      <li v-for="e in g.items" :key="e.slug" class="row">
        <RouterLink :to="{ name: 'admin-event', params: { slug: e.slug } }" class="row__link">
          <span class="row__date">
            <span class="row__md num">{{ monthDay(e.startsAt) }}</span>
            <span class="row__yw">{{ year(e.startsAt) }}（{{ weekday(e.startsAt) }}）</span>
          </span>
          <span class="row__main">
            <span class="row__title">{{ e.title }}</span>
            <span class="row__meta">{{ EVENT_TYPE_LABEL[e.type] }} · {{ e.city }} · /events/{{ e.slug }}</span>
          </span>
          <span
            class="status-chip"
            :class="!e.published ? 'status-chip--draft' : isPast(e) ? 'status-chip--past' : 'status-chip--live'"
          >
            {{ !e.published ? '草稿' : isPast(e) ? '已結束' : '已發布' }}
          </span>
        </RouterLink>
        <RouterLink
          v-if="e.published"
          :to="{ name: 'event', params: { slug: e.slug } }"
          target="_blank"
          class="row__view"
          :aria-label="`在新分頁查看「${e.title}」的公開頁面`"
        >
          <ExternalLink :size="18" aria-hidden="true" />
        </RouterLink>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.group {
  margin-top: clamp(40px, 6vh, 56px);
}
.group__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 16px;
}
.group__title {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.5rem;
}
.group__count {
  font-size: 1.125rem;
  color: var(--ink-3);
}
.group__hint {
  font-size: 0.875rem;
  color: var(--ink-3);
}
.sheet {
  margin: 14px 0 0;
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
  grid-template-columns: 6.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px 20px;
  min-width: 0;
  padding: 16px 8px;
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
.row__date {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.row__md {
  font-size: 1.375rem;
  font-weight: 800;
}
.row__yw {
  font-size: 0.8125rem;
  color: var(--ink-3);
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
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .row__date {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: baseline;
    gap: 6px;
  }
  .row__md {
    font-size: 1.125rem;
  }
}
</style>
