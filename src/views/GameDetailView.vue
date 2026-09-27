<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { useApi, NotFoundError } from '@/api/client'
import type { Game, ItemResponse, ListResponse } from '@/api/types'
import { GAME_STATUS_LABEL, monthDay, pageTitle } from '@/utils/format'
import DotStickers from '@/components/DotStickers.vue'
import DiscordButton from '@/components/DiscordButton.vue'
import GameCard from '@/components/GameCard.vue'
import StateBlock from '@/components/StateBlock.vue'
import TapeHeading from '@/components/TapeHeading.vue'

const props = defineProps<{ slug: string }>()

const { data, error, loading, retry } = useApi<ItemResponse<Game>>(() => `/api/games/${props.slug}`)
const list = useApi<ListResponse<Game>>('/api/games')

const game = computed(() => data.value?.item)
const others = computed(() => (list.data.value?.items ?? []).filter((g) => g.slug !== props.slug).slice(0, 3))

watchEffect(() => {
  if (game.value) document.title = pageTitle(game.value.title)
})

// The visitor's own sticker lives only in this browser; real feedback goes to Discord.
const stuck = ref(false)
const key = computed(() => `gts:dot:${props.slug}`)
watch(
  key,
  (k) => {
    try {
      stuck.value = localStorage.getItem(k) === '1'
    } catch {
      stuck.value = false
    }
  },
  { immediate: true },
)
function stick() {
  stuck.value = !stuck.value
  try {
    if (stuck.value) localStorage.setItem(key.value, '1')
    else localStorage.removeItem(key.value)
  } catch {
    /* storage unavailable: the sticker still shows for this visit */
  }
}
</script>

<template>
  <div class="detail shell">
    <RouterLink to="/games" class="back"><ArrowLeft :size="18" aria-hidden="true" />返回遊戲作品</RouterLink>

    <StateBlock v-if="loading && !data" kind="loading" message="正在載入遊戲資訊…" />
    <StateBlock
      v-else-if="error && error instanceof NotFoundError"
      kind="missing"
      message="此遊戲可能已從網站移除。"
    >
      <RouterLink to="/games" class="sticker-btn sticker-btn--paper">瀏覽其他遊戲</RouterLink>
    </StateBlock>
    <StateBlock v-else-if="error" kind="error" @retry="retry" />

    <article v-else-if="game" class="detail__grid">
      <div class="detail__main">
        <figure class="print">
          <span class="tape tape-bit print__tape print__tape--l" aria-hidden="true"></span>
          <span class="tape tape-bit print__tape print__tape--r" aria-hidden="true"></span>
          <img :src="game.cover" :alt="`《${game.title}》封面`" width="800" height="600" />
          <figcaption v-if="data?.sample" class="print__cap hand">示範封面，日後將替換為實際遊戲畫面</figcaption>
        </figure>

        <section class="about" aria-labelledby="about-title">
          <h2 id="about-title" class="about__title">遊戲簡介</h2>
          <p class="about__pitch">{{ game.pitch }}</p>
          <p v-for="(p, i) in game.description" :key="i" class="about__p">{{ p }}</p>
        </section>

        <section class="log" aria-labelledby="log-title">
          <h2 id="log-title" class="about__title">更新紀錄</h2>
          <ol class="log__list">
            <li v-for="b in game.buildLog" :key="b.version" class="log__item">
              <span class="log__ver num">{{ b.version }}</span>
              <span class="log__date num">{{ monthDay(b.date) }}</span>
              <p class="log__note">{{ b.note }}</p>
            </li>
          </ol>
        </section>
      </div>

      <aside class="index-card" aria-labelledby="game-title">
        <span class="tape tape-bit index-card__tape" aria-hidden="true"></span>
        <p v-if="game.status === 'seeking'" class="index-card__status">{{ GAME_STATUS_LABEL[game.status] }}</p>
        <h1 id="game-title" class="index-card__title">{{ game.title }}</h1>
        <p class="index-card__en">{{ game.titleEn }}</p>

        <dl class="facts">
          <div><dt>開發者</dt><dd>{{ game.studio }}（{{ game.team }}）</dd></div>
          <div><dt>版本</dt><dd class="num">{{ game.build }}</dd></div>
          <div><dt>平台</dt><dd>{{ game.platforms.join('、') }}</dd></div>
          <div><dt>類型</dt><dd>{{ game.genres.join('、') }}</dd></div>
          <div><dt>更新日期</dt><dd class="num">{{ monthDay(game.updatedAt) }}</dd></div>
        </dl>

        <section class="ask" aria-labelledby="ask-title">
          <h2 id="ask-title" class="ask__title">開發者希望了解</h2>
          <ul class="ask__list hand">
            <li v-for="q in game.feedbackWanted" :key="q">{{ q }}</li>
          </ul>
        </section>

        <div class="votes">
          <DotStickers :count="game.dots + (stuck ? 1 : 0)" size="lg" :max="10" />
          <p class="votes__label">
            <strong class="num">{{ game.dots }}</strong> 人試玩過<span v-if="stuck">，另加上您的標記</span>
          </p>
          <button type="button" class="votes__btn" :aria-pressed="stuck" @click="stick">
            <span class="votes__dot" aria-hidden="true"></span>{{ stuck ? '取消試玩標記' : '標記為已試玩' }}
          </button>
          <p class="votes__fine">此標記僅儲存於您的瀏覽器。如需提供回饋，請至 Discord 告知開發者。</p>
        </div>

        <DiscordButton label="至 Discord 取得 build" class="index-card__cta" />
      </aside>
    </article>

    <section v-if="game && others.length" class="more" aria-labelledby="more-title">
      <TapeHeading id="more-title" :tilt="1">其他遊戲作品</TapeHeading>
      <div class="more__grid">
        <GameCard v-for="g in others" :key="g.slug" :game="g" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.detail {
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
.detail__grid {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: 56px clamp(32px, 5vw, 80px);
  align-items: start;
  margin-top: 24px;
}

.print {
  position: relative;
  margin: 0;
  padding: 16px 16px 12px;
  background: var(--card);
  box-shadow: var(--shadow-paper);
  transform: rotate(-0.8deg);
}
.print img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  outline: 1px solid var(--rule);
}
.print__tape {
  top: -11px;
  width: 96px;
  height: 26px;
}
.print__tape--l {
  left: -18px;
  rotate: -32deg;
  top: 6px;
}
.print__tape--r {
  right: -18px;
  rotate: 30deg;
  top: 6px;
}
.print__cap {
  margin-top: 10px;
  font-size: 1rem;
  color: var(--ink-3);
}

.about,
.log {
  margin-top: clamp(48px, 7vh, 72px);
  max-width: 40em;
}
.about__title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.625rem;
  padding-bottom: 10px;
  border-bottom: 3px solid var(--ink);
}
.about__pitch {
  margin-top: 20px;
  font-size: 1.3125rem;
  font-weight: 700;
  line-height: 1.6;
}
.about__p {
  margin-top: 16px;
  font-size: 1.0625rem;
  line-height: 1.85;
  color: var(--ink-2);
}
.log__list {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.log__item {
  display: grid;
  grid-template-columns: 5rem 3.5rem minmax(0, 1fr);
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--rule);
  align-items: baseline;
}
.log__ver {
  font-weight: 800;
}
.log__date {
  font-size: 0.875rem;
  color: var(--ink-3);
}

.index-card {
  position: sticky;
  top: 100px;
  padding: 32px clamp(20px, 2.5vw, 32px) 28px;
  background-color: var(--card);
  background-image: repeating-linear-gradient(180deg, transparent 0 35px, rgb(23 22 27 / 0.07) 35px 36px);
  background-position: 0 14px;
  box-shadow: var(--shadow-lift);
  transform: rotate(0.8deg);
}
.index-card__tape {
  top: -12px;
  left: 50%;
  translate: -50% 0;
  width: 110px;
  height: 26px;
  rotate: -3deg;
}
.index-card__status {
  display: inline-block;
  padding: 3px 12px 4px;
  border-radius: 999px;
  background: var(--dot);
  font-size: 0.875rem;
  font-weight: 700;
}
.index-card__title {
  margin-top: 14px;
  font-family: var(--font-body);
  font-weight: 900;
  font-size: clamp(2.25rem, 4vw, 3.5rem);
  letter-spacing: -0.03em;
  line-height: 1.08;
}
.index-card__en {
  margin-top: 6px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
  letter-spacing: -0.02em;
  color: var(--ink-3);
}
.facts {
  margin: 22px 0 0;
  border-top: 3px solid var(--ink);
}
.facts div {
  display: grid;
  grid-template-columns: 3.5em minmax(0, 1fr);
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--rule);
}
.facts dt {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--ink-3);
}
.facts dd {
  margin: 0;
  font-weight: 500;
}
.ask {
  margin-top: 26px;
}
.ask__title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.125rem;
}
.ask__list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.ask__list li {
  display: flex;
  gap: 12px;
  font-size: 1.1875rem;
  line-height: 1.45;
}
.ask__list li::before {
  content: '';
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 4px;
  border: 2px solid var(--ink);
  border-radius: 3px;
  transform: rotate(-3deg);
}
.votes {
  display: grid;
  justify-items: start;
  gap: 10px;
  margin-top: 26px;
  padding-top: 20px;
  border-top: 1px dashed var(--rule);
}
.votes__label {
  font-weight: 700;
}
.votes__btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 16px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: var(--card);
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.3s var(--ease-out);
}
.votes__btn:hover {
  transform: translateY(-1px);
  background: var(--wall);
}
.votes__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px dashed var(--dot-deep);
  transition: background-color 0.2s, border-color 0.2s;
}
.votes__btn[aria-pressed='true'] .votes__dot {
  background: var(--dot);
  border: 2px solid var(--dot);
}
.votes__fine {
  font-size: 0.8125rem;
  color: var(--ink-3);
}
.index-card__cta {
  margin-top: 24px;
  width: 100%;
  justify-content: center;
}

.more {
  margin-top: clamp(80px, 12vh, 140px);
}
.more__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 48px clamp(24px, 3vw, 48px);
  margin-top: 48px;
  align-items: start;
}

@media (max-width: 960px) {
  .detail__grid {
    grid-template-columns: 1fr;
  }
  .index-card {
    position: relative;
    top: 0;
    grid-row: 2;
  }
  .detail__main {
    display: contents;
  }
  .print {
    grid-row: 1;
  }
  .about {
    grid-row: 3;
  }
  .log {
    grid-row: 4;
  }
  .about,
  .log {
    margin-top: 0;
  }
  .more__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .more__grid {
    grid-template-columns: 1fr;
  }
  .log__item {
    grid-template-columns: 4.5rem minmax(0, 1fr);
  }
  .log__note {
    grid-column: 1 / -1;
  }
  .print__tape--l {
    left: -8px;
  }
  .print__tape--r {
    right: -8px;
  }
}
</style>
