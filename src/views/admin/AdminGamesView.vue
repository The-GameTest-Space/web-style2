<script setup lang="ts">
import { computed, ref } from 'vue'
import { Eye, EyeOff, ExternalLink, Pencil, Pin, PinOff } from 'lucide-vue-next'
import { adminApi } from '@/api/admin'
import type { OwnGame } from '@/api/types'
import { askConfirm } from '@/composables/useConfirm'
import { gameStatusLabel } from '@/utils/format'
import StateBlock from '@/components/StateBlock.vue'
import TapeHeading from '@/components/TapeHeading.vue'

const games = ref<OwnGame[] | null>(null)
const pinned = ref<string | null>(null)
const failed = ref(false)
// The game whose pin or visibility is being changed.
const busy = ref<string | null>(null)
const status = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)

async function load() {
  failed.value = false
  try {
    const res = await adminApi.games()
    games.value = res.items
    pinned.value = res.pinned
  } catch (e) {
    console.error(e)
    failed.value = true
  }
}
load()

const pinnedGame = computed(() => games.value?.find((g) => g.slug === pinned.value))

/** Pin a game (only one at a time), or unpin with null. */
async function pin(g: OwnGame | null) {
  busy.value = g?.slug ?? pinned.value
  status.value = null
  try {
    pinned.value = (await adminApi.pinGame(g?.slug ?? null)).pinned
    status.value = { kind: 'ok', text: g ? `已將《${g.title}》置頂。` : '已取消置頂。' }
  } catch (e) {
    console.error(e)
    status.value = { kind: 'error', text: '無法更新置頂，可能是網路連線不穩定，請稍後再試。' }
  } finally {
    busy.value = null
  }
}

async function setHidden(g: OwnGame, hidden: boolean) {
  if (hidden) {
    const ok = await askConfirm({
      title: `要隱藏《${g.title}》嗎？`,
      message: '隱藏後不會出現在公開頁面，刊登者仍可在「我的遊戲」看到它。',
      confirmLabel: '隱藏遊戲',
      cancelLabel: '取消',
    })
    if (!ok) return
  }
  busy.value = g.slug
  status.value = null
  try {
    const { item } = await adminApi.hideGame(g.slug, hidden)
    games.value = games.value!.map((x) => (x.slug === item.slug ? item : x))
    // The Worker unpins a game it hides.
    if (hidden && pinned.value === g.slug) pinned.value = null
    status.value = { kind: 'ok', text: hidden ? `已隱藏《${g.title}》。` : `已重新公開《${g.title}》。` }
  } catch (e) {
    console.error(e)
    status.value = { kind: 'error', text: '無法更新，可能是網路連線不穩定，請稍後再試。' }
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <header class="admin-head">
    <div>
      <TapeHeading as="h1" :tilt="-1">遊戲管理</TapeHeading>
      <p class="admin-head__lede">
        Discord 伺服器成員刊登的遊戲會直接公開。可以選一款遊戲置頂：它會排在遊戲作品頁的最前面，也會顯示在首頁。不適當的遊戲可以隱藏。公開頁面最多約 5 分鐘後更新。
      </p>
    </div>
  </header>
  <p v-if="status" class="admin-flash" :class="{ 'is-error': status.kind === 'error' }" role="status">{{ status.text }}</p>

  <StateBlock v-if="!games && !failed" kind="loading" message="正在載入遊戲…" />
  <StateBlock v-else-if="failed" kind="error" @retry="load" />
  <StateBlock v-else-if="!games?.length" kind="empty" message="還沒有人刊登遊戲。" />

  <template v-else>
    <section class="pinned" aria-labelledby="pinned-title">
      <h2 id="pinned-title" class="pinned__title"><Pin :size="20" aria-hidden="true" />置頂遊戲</h2>
      <template v-if="pinnedGame">
        <p class="pinned__name">《{{ pinnedGame.title }}》</p>
        <button type="button" class="outline-btn" :disabled="!!busy" @click="pin(null)"><PinOff aria-hidden="true" />取消置頂</button>
      </template>
      <p v-else class="pinned__none">目前沒有置頂的遊戲，首頁會顯示最近更新的遊戲。</p>
    </section>

    <ol class="sheet">
      <li v-for="g in games" :key="g.slug" class="row" :class="{ 'is-hidden': g.hidden }">
        <img :src="g.cover" alt="" class="row__cover" width="96" height="72" loading="lazy" />
        <div class="row__main">
          <p class="row__title">
            {{ g.title }}
            <span v-if="g.slug === pinned" class="status-chip status-chip--live">置頂</span>
            <span v-if="g.hidden" class="status-chip status-chip--draft">已隱藏</span>
          </p>
          <p class="row__meta">
            {{ g.studio }} · <span class="num">{{ g.build }}</span> · {{ gameStatusLabel(g.status) }} · 刊登者 {{ g.ownerName || g.ownerUid }} ·
            /games/{{ g.slug }}
          </p>
        </div>
        <div class="row__actions">
          <button
            type="button"
            class="outline-btn"
            :aria-pressed="g.slug === pinned"
            :disabled="g.hidden || !!busy"
            :title="g.hidden ? '隱藏的遊戲不能置頂' : undefined"
            @click="pin(g.slug === pinned ? null : g)"
          >
            <Pin aria-hidden="true" />置頂
          </button>
          <button type="button" class="outline-btn" :disabled="!!busy" @click="setHidden(g, !g.hidden)">
            <component :is="g.hidden ? Eye : EyeOff" aria-hidden="true" />{{ g.hidden ? '重新公開' : '隱藏' }}
          </button>
          <RouterLink :to="{ name: 'game-edit', params: { slug: g.slug } }" class="icon-link" :aria-label="`編輯《${g.title}》`">
            <Pencil :size="18" aria-hidden="true" />
          </RouterLink>
          <RouterLink
            v-if="!g.hidden"
            :to="{ name: 'game', params: { slug: g.slug } }"
            target="_blank"
            class="icon-link"
            :aria-label="`在新分頁查看《${g.title}》的公開頁面`"
          >
            <ExternalLink :size="18" aria-hidden="true" />
          </RouterLink>
        </div>
      </li>
    </ol>
  </template>
</template>

<style scoped>
.admin-flash.is-error::before {
  background: var(--ink);
}
.pinned {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  margin-top: clamp(32px, 5vh, 48px);
  padding: 18px 22px;
  border: 2px dashed var(--ink);
  border-radius: 10px;
}
.pinned__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.125rem;
}
.pinned__title svg {
  color: var(--dot-deep);
}
.pinned__name {
  font-weight: 900;
  font-size: 1.125rem;
}
.pinned__none {
  color: var(--ink-2);
}
.sheet {
  margin: 20px 0 0;
  padding: 4px clamp(8px, 2vw, 24px);
  list-style: none;
  background: var(--card);
  box-shadow: var(--shadow-paper);
}
.row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px 20px;
  padding: 14px 8px;
}
.row + .row {
  border-top: 1px solid var(--rule);
}
.row__cover {
  width: 96px;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  outline: 1px solid var(--rule);
  background: var(--wall);
}
.row.is-hidden .row__cover {
  opacity: 0.45;
  filter: grayscale(1);
}
.row__main {
  min-width: 0;
}
.row__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  font-weight: 900;
  font-size: 1.125rem;
  line-height: 1.4;
}
.row__meta {
  font-size: 0.8125rem;
  color: var(--ink-3);
  overflow-wrap: anywhere;
}
.row__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: end;
  gap: 8px;
}
.row__actions .outline-btn {
  min-height: 40px;
  padding: 0 14px;
  font-size: 0.9375rem;
}
.row__actions .outline-btn[aria-pressed='true'] {
  background: var(--dot);
  border-color: var(--dot);
}
.row__actions .outline-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.icon-link {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  color: var(--ink);
  transition: background-color 0.2s;
}
.icon-link:hover {
  background: var(--wall);
}
@media (max-width: 760px) {
  .row {
    grid-template-columns: 72px minmax(0, 1fr);
  }
  .row__cover {
    width: 72px;
  }
  .row__actions {
    grid-column: 1 / -1;
    justify-content: start;
  }
}
</style>
