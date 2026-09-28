<script setup lang="ts">
import { computed } from 'vue'
import { Pin } from 'lucide-vue-next'
import type { Game } from '@/api/types'
import { gameStatusLabel, tiltFor } from '@/utils/format'
import { t } from '@/i18n'
import DotStickers from './DotStickers.vue'
import I18nT from './I18nT.vue'
import Viewfinder from './Viewfinder.vue'

const props = withDefaults(defineProps<{ game: Game; pin?: boolean; order?: number }>(), { pin: false, order: 0 })

const tilt = computed(() => tiltFor(props.game.slug))
const tapeTilt = computed(() => tiltFor(props.game.slug + 'tape', 9))
</script>

<template>
  <RouterLink
    :to="{ name: 'game', params: { slug: game.slug } }"
    class="game-card vf-target"
    :class="{ 'game-card--pin': pin }"
    :style="{ '--tilt': `${tilt}deg`, '--tape-tilt': `${tapeTilt}deg`, '--order': order }"
  >
    <Viewfinder />
    <span class="tape tape-bit game-card__tape" aria-hidden="true"></span>
    <article class="game-card__paper">
      <div class="game-card__print">
        <img :src="game.cover" :alt="t('game.coverAlt', { title: game.title })" width="400" height="300" loading="lazy" />
      </div>
      <div class="game-card__body">
        <p v-if="game.pinned" class="game-card__pinned"><Pin :size="14" aria-hidden="true" />{{ t('game.pinned') }}</p>
        <div class="game-card__head">
          <h3 class="game-card__title" lang="zh-Hant-TW">{{ game.title }}</h3>
          <span v-if="game.status === 'seeking'" class="game-card__status">{{ gameStatusLabel(game.status) }}</span>
        </div>
        <p class="game-card__by" lang="zh-Hant-TW">
          <span>{{ game.studio }}</span>
          <span aria-hidden="true">·</span>
          <span class="num">{{ game.build }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ game.genres.join(' / ') }}</span>
        </p>
        <p class="game-card__ask hand">{{ t('game.ask', { q: game.feedbackWanted[0] ?? '' }) }}</p>
        <!-- Only the sample games have a playtester count; nothing counts real ones yet. -->
        <div v-if="game.dots" class="game-card__foot">
          <DotStickers :count="game.dots" :animate="pin" :delay="600 + order * 90">
            <span class="game-card__dots-label">
              <I18nT k="game.played" :n="game.dots"><template #n><span class="num">{{ game.dots }}</span></template></I18nT>
            </span>
          </DotStickers>
        </div>
      </div>
    </article>
  </RouterLink>
</template>

<style scoped>
.game-card {
  position: relative;
  display: block;
  color: inherit;
  text-decoration: none;
  transform: rotate(var(--tilt));
  transition: transform 0.5s var(--ease-out);
}
.game-card:hover,
.game-card:focus-visible {
  transform: rotate(0deg) translateY(-4px);
}
.game-card__tape {
  top: -10px;
  left: 50%;
  translate: -50% 0;
  rotate: var(--tape-tilt);
}
.game-card__paper {
  position: relative;
  background: var(--card);
  padding: 12px 12px 16px;
  box-shadow: var(--shadow-paper);
  transition: box-shadow 0.5s var(--ease-out);
}
.game-card:hover .game-card__paper,
.game-card:focus-visible .game-card__paper {
  box-shadow: var(--shadow-lift);
}
.game-card__print {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--wall);
  outline: 1px solid var(--rule);
}
.game-card__print img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.8s var(--ease-out);
}
.game-card:hover .game-card__print img {
  transform: scale(1.03);
}
.game-card__body {
  padding: 14px 6px 0;
}
.game-card__pinned {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  font-size: 0.8125rem;
  font-weight: 800;
}
.game-card__pinned svg {
  color: var(--dot-deep);
}
.game-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.game-card__title {
  font-size: 1.5rem;
  letter-spacing: -0.01em;
  font-weight: 900;
  font-family: var(--font-body);
}
.game-card__status {
  flex: none;
  margin-top: 3px;
  padding: 3px 9px 4px;
  border-radius: 999px;
  background: var(--dot);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.3;
}
.game-card__by {
  display: flex;
  flex-wrap: wrap;
  gap: 0 6px;
  margin-top: 4px;
  font-size: 0.875rem;
  color: var(--ink-3);
}
.game-card__ask {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--rule);
  font-size: 1.0625rem;
  line-height: 1.45;
}
.game-card__foot {
  margin-top: 12px;
}
.game-card__dots-label {
  font-size: 0.875rem;
  font-weight: 700;
}

/* Pinned on load: the card is pressed onto the wall, then taped. */
.game-card--pin {
  animation: card-pin 0.7s var(--ease-out) calc(var(--order) * 90ms) backwards;
}
.game-card--pin .game-card__tape {
  animation: tape-slap 0.35s var(--ease-slap) calc(var(--order) * 90ms + 380ms) backwards;
}
@keyframes card-pin {
  from {
    opacity: 0;
    transform: translateY(-18px) rotate(calc(var(--tilt) * 3)) scale(1.04);
  }
}
@keyframes tape-slap {
  from {
    opacity: 0;
    transform: scale(1.5);
  }
}
</style>
