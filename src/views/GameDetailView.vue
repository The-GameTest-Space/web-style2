<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { useApi, NotFoundError } from '@/api/client'
import type { Game, ItemResponse, ListResponse } from '@/api/types'
import { gameStatusLabel, monthDay, pageTitle } from '@/utils/format'
import DiscordButton from '@/components/DiscordButton.vue'
import DiscordIcon from '@/components/DiscordIcon.vue'
import GameCard from '@/components/GameCard.vue'
import StateBlock from '@/components/StateBlock.vue'
import TapeHeading from '@/components/TapeHeading.vue'
import { t } from '@/i18n'

const props = defineProps<{ slug: string }>()

const { data, error, loading, retry } = useApi<ItemResponse<Game>>(() => `/api/games/${props.slug}`)
const list = useApi<ListResponse<Game>>('/api/games')

const game = computed(() => data.value?.item)
const others = computed(() => (list.data.value?.items ?? []).filter((g) => g.slug !== props.slug).slice(0, 3))

watchEffect(() => {
  if (game.value) document.title = pageTitle(game.value.title)
})

// "Mark as played" is switched off until playtests are recorded on the
// server: the mark lived only in this browser. To bring it back, uncomment
// it here, in the template (.votes) and in the styles, and import ref and
// watch from vue, DotStickers and I18nT again.
//
// // The visitor's own sticker lives only in this browser; real feedback goes to Discord.
// const stuck = ref(false)
// const key = computed(() => `gts:dot:${props.slug}`)
// watch(
//   key,
//   (k) => {
//     try {
//       stuck.value = localStorage.getItem(k) === '1'
//     } catch {
//       stuck.value = false
//     }
//   },
//   { immediate: true },
// )
// function stick() {
//   stuck.value = !stuck.value
//   try {
//     if (stuck.value) localStorage.setItem(key.value, '1')
//     else localStorage.removeItem(key.value)
//   } catch {
//     /* storage unavailable: the sticker still shows for this visit */
//   }
// }
</script>

<template>
  <div class="detail shell">
    <RouterLink to="/games" class="back"><ArrowLeft :size="18" aria-hidden="true" />{{ t('game.back') }}</RouterLink>

    <StateBlock v-if="loading && !data" kind="loading" :message="t('game.loading')" />
    <StateBlock
      v-else-if="error && error instanceof NotFoundError"
      kind="missing"
      :message="t('game.missing')"
    >
      <RouterLink to="/games" class="sticker-btn sticker-btn--paper">{{ t('game.browse') }}</RouterLink>
    </StateBlock>
    <StateBlock v-else-if="error" kind="error" @retry="retry" />

    <article v-else-if="game" class="detail__grid">
      <div class="detail__main">
        <figure class="print">
          <span class="tape tape-bit print__tape print__tape--l" aria-hidden="true"></span>
          <span class="tape tape-bit print__tape print__tape--r" aria-hidden="true"></span>
          <img :src="game.cover" :alt="t('game.coverAlt', { title: game.title })" width="800" height="600" />
          <figcaption v-if="data?.sample" class="print__cap hand">{{ t('game.sampleCover') }}</figcaption>
        </figure>

        <section class="about" aria-labelledby="about-title">
          <h2 id="about-title" class="about__title">{{ t('game.about') }}</h2>
          <p class="about__pitch" lang="zh-Hant-TW">{{ game.pitch }}</p>
          <p v-for="(p, i) in game.description" :key="i" class="about__p" lang="zh-Hant-TW">{{ p }}</p>
        </section>

        <section class="log" aria-labelledby="log-title">
          <h2 id="log-title" class="about__title">{{ t('game.log') }}</h2>
          <ol class="log__list">
            <li v-for="b in game.buildLog" :key="b.version" class="log__item">
              <span class="log__ver num">{{ b.version }}</span>
              <span class="log__date num">{{ monthDay(b.date) }}</span>
              <p class="log__note" lang="zh-Hant-TW">{{ b.note }}</p>
            </li>
          </ol>
        </section>
      </div>

      <aside class="index-card" aria-labelledby="game-title">
        <span class="tape tape-bit index-card__tape" aria-hidden="true"></span>
        <p v-if="game.status === 'seeking'" class="index-card__status">{{ gameStatusLabel(game.status) }}</p>
        <h1 id="game-title" class="index-card__title" lang="zh-Hant-TW">{{ game.title }}</h1>
        <p v-if="game.titleEn" class="index-card__en">{{ game.titleEn }}</p>

        <dl class="facts">
          <div>
            <dt>{{ t('game.developer') }}</dt>
            <dd lang="zh-Hant-TW">{{ game.team ? t('game.studioTeam', { studio: game.studio, team: game.team }) : game.studio }}</dd>
          </div>
          <div><dt>{{ t('game.build') }}</dt><dd class="num">{{ game.build }}</dd></div>
          <div><dt>{{ t('game.platforms') }}</dt><dd lang="zh-Hant-TW">{{ game.platforms.join(t('common.listSep')) }}</dd></div>
          <div><dt>{{ t('game.genres') }}</dt><dd lang="zh-Hant-TW">{{ game.genres.join(t('common.listSep')) }}</dd></div>
          <div><dt>{{ t('game.updated') }}</dt><dd class="num">{{ monthDay(game.updatedAt) }}</dd></div>
        </dl>

        <section class="ask" aria-labelledby="ask-title">
          <h2 id="ask-title" class="ask__title">{{ t('game.asks') }}</h2>
          <ul class="ask__list hand" lang="zh-Hant-TW">
            <li v-for="q in game.feedbackWanted" :key="q">{{ q }}</li>
          </ul>
        </section>

        <!-- "Mark as played": switched off until playtests are recorded on the
             server (see the script). Only the sample games have a playtester
             count; nothing counts real ones yet.
        <div class="votes">
          <DotStickers v-if="(game.dots ?? 0) + (stuck ? 1 : 0)" :count="(game.dots ?? 0) + (stuck ? 1 : 0)" size="lg" :max="10" />
          <p v-if="game.dots !== undefined" class="votes__label">
            <I18nT k="game.played" :n="game.dots"><template #n><strong class="num">{{ game.dots }}</strong></template></I18nT
            ><span v-if="stuck">{{ t('game.plusYours') }}</span>
          </p>
          <button type="button" class="votes__btn" :aria-pressed="stuck" @click="stick">
            <span class="votes__dot" aria-hidden="true"></span>{{ stuck ? t('game.unmark') : t('game.mark') }}
          </button>
          <p class="votes__fine">{{ t('game.markNote') }}</p>
        </div>
        -->

        <!-- One way into Discord: the game's thread when its developer gave one, else the server. -->
        <a v-if="game.thread" :href="game.thread" target="_blank" rel="noopener" class="sticker-btn index-card__cta">
          <DiscordIcon /><span>{{ t('game.thread') }}</span><span class="visually-hidden">{{ t('common.newTab') }}</span>
        </a>
        <DiscordButton v-else variant="paper" :label="t('game.askOnDiscord')" class="index-card__cta" />
      </aside>
    </article>

    <section v-if="game && others.length" class="more" aria-labelledby="more-title">
      <TapeHeading id="more-title" :tilt="1">{{ t('game.more') }}</TapeHeading>
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
  /* Over the height attribute, so a cover of any shape is cropped to 4:3. */
  height: auto;
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
  /* A paragraph keeps the line breaks its owner typed. */
  white-space: pre-line;
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
/* "Mark as played", switched off (see the script).
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
*/
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
