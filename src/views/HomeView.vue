<script setup lang="ts">
import { computed } from 'vue'
import { useApi } from '@/api/client'
import type { Game, GameEvent, ListResponse } from '@/api/types'
import { daysUntil } from '@/utils/format'
import GameCard from '@/components/GameCard.vue'
import EventRow from '@/components/EventRow.vue'
import DiscordSheet from '@/components/DiscordSheet.vue'
import DiscordButton from '@/components/DiscordButton.vue'
import TapeHeading from '@/components/TapeHeading.vue'
import SampleNote from '@/components/SampleNote.vue'
import StateBlock from '@/components/StateBlock.vue'
import BrandMark from '@/components/BrandMark.vue'

const games = useApi<ListResponse<Game>>('/api/games')
const events = useApi<ListResponse<GameEvent>>('/api/events')

// The hero pins the most recently updated game.
const featured = computed(() => [...(games.data.value?.items ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0])
const wall = computed(() => (games.data.value?.items ?? []).filter((g) => g !== featured.value).slice(0, 6))
const upcoming = computed(() => (events.data.value?.items ?? []).filter((e) => daysUntil(e.startsAt) >= 0).slice(0, 4))

const loop = [
  { verb: '發布遊戲', text: '在 Discord 發布遊戲的 build，並說明最希望了解的一個問題。' },
  { verb: '成員試玩', text: '社群中的開發者與玩家會下載遊戲試玩，或在線上試玩會中直接遊玩。' },
  { verb: '取得回饋', text: '試玩者會回報卡關之處、令人發笑之處，以及先前未被發現的 bug，這些都是實際遊玩時的反應。' },
  { verb: '推出新版', text: '修正完成後再次發布。您也可以試玩其他成員的遊戲；在本社群中，試玩以相互交換為原則。' },
]
</script>

<template>
  <!-- First viewport: the wall itself. -->
  <section class="hero shell" aria-labelledby="hero-title">
    <div class="hero__copy">
      <h1 id="hero-title" class="hero__title">
        為您的遊戲<br />尋找試玩者<span class="hero__period" data-intro-target aria-hidden="true"></span>
      </h1>
      <p class="hero__lede">
        The Game Test Space 是台灣遊戲開發者<strong>互相試玩</strong>作品的社群。開發者在 Discord 發布遊戲的 build，由其他成員試玩並提供回饋；開發者也可以試玩其他成員的作品。
      </p>
      <div class="hero__actions">
        <DiscordButton label="加入 Discord 尋求試玩" />
        <a href="#wall" class="text-link hero__peek">瀏覽社群遊戲作品</a>
      </div>
    </div>

    <div class="hero__stage">
      <div class="hero__card">
        <GameCard v-if="featured" :game="featured" pin />
        <div v-else class="hero__card-ghost" aria-hidden="true"></div>
        <p class="hero__note hand" aria-hidden="true">新增試玩紀錄</p>
      </div>
      <svg class="hero__arrow" viewBox="0 0 160 190" aria-hidden="true">
        <path class="hero__arrow-line" pathLength="1" d="M60 6C18 40 8 96 38 132s74 40 106 30" />
        <path class="hero__arrow-head" pathLength="1" d="M122 146l24 16-26 12" />
      </svg>
      <div class="hero__sheet">
        <DiscordSheet :delay="1700" :tilt="2" />
      </div>
    </div>
  </section>

  <!-- The loop the community runs on. -->
  <section class="loop shell" aria-labelledby="loop-title">
    <TapeHeading id="loop-title" :tilt="-1.5">試玩流程</TapeHeading>
    <ol class="loop__steps">
      <li v-for="(step, i) in loop" :key="step.verb" class="loop__step">
        <span class="loop__n hand" aria-hidden="true">{{ i + 1 }}</span>
        <h3 class="loop__verb">{{ step.verb }}</h3>
        <p class="loop__text">{{ step.text }}</p>
        <svg v-if="i < loop.length - 1" class="loop__arrow" viewBox="0 0 60 24" aria-hidden="true">
          <path d="M3 14c14-7 30-9 50-3" />
          <path d="M44 4l10 7-11 6" />
        </svg>
      </li>
    </ol>
    <!-- The line stretches with the row; the head is drawn at a fixed size so it never distorts. -->
    <div class="loop__return" aria-hidden="true">
      <svg class="loop__return-line" viewBox="0 0 1000 64" preserveAspectRatio="none">
        <path d="M960 4V26C960 50 944 58 904 58H96C56 58 40 50 40 26V10" />
      </svg>
      <svg class="loop__return-head" viewBox="0 0 24 16">
        <path d="M3 14L12 3l9 11" />
      </svg>
    </div>
  </section>

  <!-- The wall of games. -->
  <section id="wall" class="wall shell" aria-labelledby="wall-title">
    <div class="section-head">
      <TapeHeading id="wall-title" :tilt="1">社群遊戲作品</TapeHeading>
      <SampleNote v-if="games.data.value?.sample" />
    </div>
    <StateBlock v-if="games.loading.value && !games.data.value" kind="loading" />
    <StateBlock v-else-if="games.error.value" kind="error" @retry="games.retry" />
    <StateBlock v-else-if="!featured" kind="empty" message="還沒有刊登的遊戲。尚未完成的遊戲也可以，請至 Discord 發布遊戲的 build。" />
    <div v-else class="wall__grid">
      <GameCard v-for="g in wall" :key="g.slug" :game="g" class="wall__card" />
    </div>
    <div class="section-foot">
      <RouterLink to="/games" class="sticker-btn sticker-btn--paper">查看全部遊戲 →</RouterLink>
    </div>
  </section>

  <!-- The D-day board. -->
  <section class="board-section shell" aria-labelledby="events-title">
    <div class="section-head">
      <TapeHeading id="events-title" :tilt="-0.8">近期活動</TapeHeading>
      <SampleNote v-if="events.data.value?.sample" text="示範資料：活動資訊整理中" />
    </div>
    <div class="board">
      <span class="tape tape-bit board__tape board__tape--l" aria-hidden="true"></span>
      <span class="tape tape-bit board__tape board__tape--r" aria-hidden="true"></span>
      <StateBlock v-if="events.loading.value && !events.data.value" kind="loading" message="正在載入活動資訊…" />
      <StateBlock v-else-if="events.error.value" kind="error" @retry="events.retry" />
      <StateBlock v-else-if="!upcoming.length" kind="empty" message="目前沒有即將舉行的活動。" />
      <ol v-else class="board__list">
        <EventRow v-for="e in upcoming" :key="e.slug" :event="e" />
      </ol>
    </div>
    <div class="section-foot">
      <RouterLink to="/events" class="sticker-btn sticker-btn--paper">查看全部活動 →</RouterLink>
    </div>
  </section>

  <!-- Discord is a whole orange wall, not a button. -->
  <section class="join" aria-labelledby="join-title">
    <span class="join__corner join__corner--tl" aria-hidden="true"></span>
    <span class="join__corner join__corner--tr" aria-hidden="true"></span>
    <span class="join__corner join__corner--bl" aria-hidden="true"></span>
    <span class="join__corner join__corner--br" aria-hidden="true"></span>
    <div class="shell join__grid">
      <div class="join__copy">
        <BrandMark :size="72" class="join__mark" />
        <h2 id="join-title" class="join__title">在 Discord<br />取得試玩回饋。</h2>
        <p class="join__lede">本網站用於展示遊戲與活動資訊，實際的試玩交流在 Discord 進行。加入後可以：</p>
        <ul class="join__list">
          <li>發布遊戲的 build，邀請成員測試</li>
          <li>試玩其他成員的遊戲並提供回饋</li>
          <li>邀集成員一同參加 Game Jam、聚會與展覽</li>
        </ul>
      </div>
      <DiscordSheet size="lg" :tilt="-1.5" class="join__sheet" />
    </div>
  </section>
</template>

<style scoped>
/* ---------- Hero ---------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: 32px clamp(24px, 4vw, 64px);
  align-items: center;
  min-height: calc(100svh - 76px);
  padding-top: clamp(24px, 5vh, 56px);
  padding-bottom: clamp(48px, 8vh, 96px);
}
.hero__title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: clamp(3.25rem, 8.4vw, 7.5rem);
  line-height: 1.1;
  letter-spacing: -0.035em;
}
.hero__period {
  display: inline-block;
  width: 0.24em;
  height: 0.24em;
  margin-left: 0.06em;
  border-radius: 50%;
  background: var(--dot);
  box-shadow: 0 2px 3px rgb(23 22 27 / 0.25);
  animation: period-land 0.55s var(--ease-slap) 0.9s backwards;
}
.hero__lede {
  margin-top: clamp(20px, 3vh, 32px);
  max-width: 34em;
  font-size: clamp(1.0625rem, 1.4vw, 1.25rem);
  line-height: 1.75;
  color: var(--ink-2);
}
.hero__lede strong {
  color: var(--ink);
  font-weight: 900;
  background: linear-gradient(transparent 62%, rgb(255 106 43 / 0.55) 62% 92%, transparent 92%);
}
.hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 28px;
  margin-top: clamp(24px, 4vh, 40px);
}
.hero__peek {
  font-size: 1.0625rem;
}

.hero__stage {
  position: relative;
  display: grid;
  padding: 18px 0 0;
}
.hero__card {
  position: relative;
  width: min(100%, 360px);
}
.hero__card-ghost {
  aspect-ratio: 360 / 470;
  border: 2px dashed rgb(23 22 27 / 0.3);
}
.hero__note {
  position: absolute;
  right: -28px;
  top: -44px;
  white-space: nowrap;
  z-index: 5;
  font-size: 1.375rem;
  color: var(--ink);
  transform: rotate(8deg);
  animation: note-in 0.4s var(--ease-out) 1.15s backwards;
}
.hero__arrow {
  position: absolute;
  left: -4%;
  top: 60%;
  width: 150px;
  height: 180px;
  overflow: visible;
  fill: none;
  stroke: var(--ink);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
}
.hero__arrow path {
  stroke-dasharray: 1;
  animation: marker-draw 0.8s cubic-bezier(0.65, 0, 0.35, 1) 1.3s backwards;
}
.hero__arrow .hero__arrow-head {
  animation-duration: 0.25s;
  animation-delay: 2.05s;
}
.hero__sheet {
  justify-self: end;
  width: min(100%, 330px);
  margin-top: -56px;
  margin-right: -4px;
  position: relative;
  z-index: 2;
  animation: sheet-pin 0.6s var(--ease-out) 1.55s backwards;
}

@keyframes period-land {
  from {
    opacity: 0;
    transform: translateY(-0.6em) scale(1.8);
  }
}
@keyframes note-in {
  from {
    opacity: 0;
    transform: rotate(8deg) translateY(6px);
  }
}
@keyframes marker-draw {
  from {
    stroke-dashoffset: 1;
  }
}
@keyframes sheet-pin {
  from {
    opacity: 0;
    transform: translateY(-16px) rotate(4deg);
  }
}

/* ---------- Loop ---------- */
.loop {
  padding-top: clamp(40px, 8vh, 96px);
  padding-bottom: clamp(56px, 10vh, 120px);
}
.loop__steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 32px clamp(28px, 4vw, 64px);
  margin: clamp(36px, 5vh, 56px) 0 0;
  padding: 0;
  list-style: none;
}
.loop__step {
  position: relative;
}
.loop__n {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 2.5px solid var(--ink);
  border-radius: 50% 46% 52% 48% / 48% 52% 46% 50%;
  font-size: 1.5rem;
  line-height: 1;
}
.loop__verb {
  margin-top: 14px;
  font-family: var(--font-body);
  font-weight: 900;
  font-size: clamp(2rem, 3.4vw, 3rem);
  letter-spacing: -0.03em;
  line-height: 1.05;
  white-space: nowrap;
}
.loop__text {
  margin-top: 12px;
  color: var(--ink-2);
  max-width: 17em;
}
.loop__arrow {
  position: absolute;
  top: 58px;
  right: calc(clamp(28px, 4vw, 64px) * -1 + 2px);
  width: clamp(24px, 3.4vw, 56px);
  fill: none;
  stroke: var(--ink);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  overflow: visible;
}
.loop__return {
  position: relative;
  height: 64px;
  margin-top: 20px;
}
.loop__return svg {
  position: absolute;
  overflow: visible;
  fill: none;
  stroke: var(--dot);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.loop__return-line {
  inset: 0;
  width: 100%;
  height: 100%;
}
.loop__return-line path {
  vector-effect: non-scaling-stroke;
}
/* Sits on the line's end: x = 40/1000 of the width, pointing straight up. */
.loop__return-head {
  left: 4%;
  top: 0;
  width: 24px;
  height: 16px;
  translate: -50% 0;
}

/* ---------- Wall + board ---------- */
.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 28px;
}
.section-foot {
  display: flex;
  justify-content: center;
  margin-top: clamp(40px, 6vh, 64px);
}
.wall {
  padding-top: clamp(24px, 4vh, 48px);
  padding-bottom: clamp(72px, 12vh, 140px);
}
.wall__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 56px clamp(24px, 3.5vw, 56px);
  margin-top: clamp(40px, 6vh, 64px);
  align-items: start;
}
.wall__card:nth-child(3n + 2) {
  margin-top: 48px;
}
.wall__card:nth-child(3n) {
  margin-top: 14px;
}

.board-section {
  padding-bottom: clamp(88px, 14vh, 160px);
}
.board {
  position: relative;
  margin-top: clamp(36px, 5vh, 56px);
  padding: 12px clamp(12px, 3vw, 36px);
  background: var(--card);
  box-shadow: var(--shadow-paper);
  transform: rotate(-0.35deg);
}
.board__tape {
  top: -11px;
}
.board__tape--l {
  left: 6%;
  rotate: -5deg;
}
.board__tape--r {
  right: 6%;
  rotate: 4deg;
}
.board__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* ---------- Join wall ---------- */
.join {
  position: relative;
  overflow: hidden;
  background: var(--dot);
  padding: clamp(80px, 13vh, 150px) 0;
  margin-bottom: 12px;
}
.join__corner {
  position: absolute;
  width: clamp(56px, 8vw, 120px);
  height: clamp(56px, 8vw, 120px);
  border: 0 solid var(--ink);
  --w: clamp(8px, 1vw, 14px);
}
.join__corner--tl {
  top: 28px;
  left: 28px;
  border-top-width: var(--w);
  border-left-width: var(--w);
  border-top-left-radius: 28px;
}
.join__corner--tr {
  top: 28px;
  right: 28px;
  border-top-width: var(--w);
  border-right-width: var(--w);
  border-top-right-radius: 28px;
}
.join__corner--bl {
  bottom: 28px;
  left: 28px;
  border-bottom-width: var(--w);
  border-left-width: var(--w);
  border-bottom-left-radius: 28px;
}
.join__corner--br {
  bottom: 28px;
  right: 28px;
  border-bottom-width: var(--w);
  border-right-width: var(--w);
  border-bottom-right-radius: 28px;
}
.join__grid {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: 48px clamp(32px, 5vw, 80px);
  align-items: center;
}
.join__mark {
  --dot: var(--card);
  color: var(--ink);
}
.join__title {
  margin-top: 24px;
  font-family: var(--font-body);
  font-weight: 900;
  font-size: clamp(2.75rem, 6.4vw, 5.75rem);
  line-height: 1.1;
  letter-spacing: -0.035em;
}
.join__lede {
  margin-top: 28px;
  font-size: 1.125rem;
  font-weight: 500;
}
.join__list {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}
.join__list li {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 1.125rem;
  font-weight: 700;
}
.join__list li::before {
  content: '';
  flex: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ink);
}
.join__sheet {
  width: 100%;
  max-width: 480px;
  justify-self: end;
}

/* ---------- Responsive ---------- */
@media (max-width: 1080px) {
  .loop__steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .loop__step:nth-child(2) .loop__arrow {
    display: none;
  }
  .loop__return {
    display: none;
  }
  .wall__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .wall__card:nth-child(n) {
    margin-top: 0;
  }
  .wall__card:nth-child(2n) {
    margin-top: 40px;
  }
}
@media (max-width: 860px) {
  .hero {
    grid-template-columns: 1fr;
    min-height: 0;
  }
  .hero__stage {
    max-width: 520px;
    width: 100%;
    justify-self: center;
  }
  .hero__card {
    width: min(84%, 360px);
  }
  .hero__note {
    left: auto;
    right: -24px;
    top: -18px;
  }
  .hero__arrow {
    left: -2%;
    width: 110px;
    height: 140px;
  }
  .join__grid {
    grid-template-columns: 1fr;
  }
  .join__sheet {
    justify-self: stretch;
    max-width: none;
  }
}
@media (max-width: 600px) {
  .loop__steps {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .loop__step {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    column-gap: 16px;
  }
  .loop__verb {
    margin-top: 0;
    align-self: center;
  }
  .loop__text {
    grid-column: 2;
    margin-top: 6px;
  }
  .loop__arrow {
    display: none;
  }
  .wall__grid {
    grid-template-columns: 1fr;
    gap: 44px;
  }
  .wall__card:nth-child(n) {
    margin-top: 0;
  }
  .hero__note {
    left: auto;
    right: -6px;
    top: -40px;
    font-size: 1.125rem;
  }
  .hero__sheet {
    width: min(92%, 330px);
  }
  .join__corner {
    display: none;
  }
}
</style>
