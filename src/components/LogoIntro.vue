<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits<{ done: [] }>()

const WORD = 'The Game Test Space'.split('').map((c) => (c === ' ' ? ' ' : c))
const CORNERS = ['tl', 'tr', 'br', 'bl'] as const
const INK_DOTS = ['l', 'r', 'b'] as const

const bg = ref<HTMLElement>()
const cornerEls = ref<HTMLElement[]>([])
const inkDots = ref<HTMLElement[]>([])
const leadDot = ref<HTMLElement>()
const ring = ref<HTMLElement>()
const chars = ref<HTMLElement[]>([])
const tag = ref<HTMLElement>()
const skipBtn = ref<HTMLElement>()

const SNAP = 'cubic-bezier(0.16, 1, 0.3, 1)'
const SLAP = 'cubic-bezier(0.22, 1, 0.36, 1)'
const SWING = 'cubic-bezier(0.65, 0, 0.35, 1)'
const EDGE = 20

let entrance: Animation[] = []
let holdTimer = 0
let exiting = false

function animate(el: Element | undefined, frames: Keyframe[], opts: KeyframeAnimationOptions) {
  if (!el) return null
  const a = el.animate(frames, { fill: 'both', ...opts })
  return a
}

/** How far a corner bracket must travel to sit in the matching viewport corner. */
function toViewportCorner(el: HTMLElement, corner: (typeof CORNERS)[number]) {
  const r = el.getBoundingClientRect()
  const w = window.innerWidth
  const h = window.innerHeight
  const dx = corner === 'tl' || corner === 'bl' ? EDGE - r.left : w - EDGE - r.right
  const dy = corner === 'tl' || corner === 'tr' ? EDGE - r.top : h - EDGE - r.bottom
  return { dx, dy }
}

function playEntrance() {
  const out: (Animation | null)[] = []

  // 1. The viewfinder focuses: brackets fly in from the screen corners and lock on.
  cornerEls.value.forEach((el, i) => {
    const { dx, dy } = toViewportCorner(el, CORNERS[i]!)
    out.push(
      animate(
        el,
        [
          { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 },
          { opacity: 1, offset: 0.2 },
          { transform: `translate(${-dx * 0.035}px, ${-dy * 0.035}px)`, offset: 0.78 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 820, delay: 120, easing: SNAP },
      ),
    )
  })

  // 2. Three ink dots are pressed on, one after another.
  inkDots.value.forEach((el, i) => {
    out.push(
      animate(
        el,
        [
          { transform: 'translateY(-36px) scale(1.7)', opacity: 0 },
          { opacity: 1, offset: 0.4 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 460, delay: 760 + i * 110, easing: SLAP },
      ),
    )
  })

  // 3. The orange dot drops last and squashes as it lands.
  out.push(
    animate(
      leadDot.value,
      [
        { transform: 'translateY(-190%) scale(1)', opacity: 0 },
        { opacity: 1, offset: 0.25 },
        { transform: 'translateY(0) scale(1.2, 0.8)', offset: 0.62 },
        { transform: 'translateY(-6%) scale(0.94, 1.06)', offset: 0.82 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 640, delay: 1160, easing: 'cubic-bezier(0.5, 0, 0.5, 1)' },
    ),
  )
  out.push(
    animate(
      ring.value,
      [
        { transform: 'scale(1)', opacity: 0.7 },
        { transform: 'scale(2.4)', opacity: 0 },
      ],
      { duration: 700, delay: 1560, easing: SNAP, fill: 'forwards' },
    ),
  )

  // 4. The wordmark sets letter by letter, then the line under it.
  chars.value.forEach((el, i) => {
    out.push(
      animate(
        el,
        [
          { transform: 'translateY(0.55em)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 520, delay: 1420 + i * 24, easing: SNAP },
      ),
    )
  })
  out.push(
    animate(
      tag.value,
      [
        { transform: 'translateY(10px)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 600, delay: 1950, easing: SNAP },
    ),
  )
  out.push(animate(skipBtn.value, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 600 }))

  entrance = out.filter((a): a is Animation => !!a)
}

function exit(fast = false) {
  if (exiting) return
  exiting = true
  window.clearTimeout(holdTimer)
  // Snap every entrance piece to its resting state, then leave from there.
  entrance.forEach((a) => a.cancel())
  window.scrollTo(0, 0)

  const k = fast ? 0.65 : 1
  const target = document.querySelector<HTMLElement>('[data-intro-target]')

  inkDots.value.forEach((el, i) => {
    animate(el, [{ transform: 'none', opacity: 1 }, { transform: 'scale(0)', opacity: 0 }], {
      duration: 300 * k,
      delay: i * 45 * k,
      easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
    })
  })
  ;[...chars.value, tag.value, skipBtn.value].forEach((el) => {
    animate(el, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-14px)', opacity: 0 }], {
      duration: 320 * k,
      easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
    })
  })

  // The viewfinder opens out until the whole screen is inside it.
  cornerEls.value.forEach((el, i) => {
    const { dx, dy } = toViewportCorner(el, CORNERS[i]!)
    animate(
      el,
      [
        { transform: 'none', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px)`, opacity: 1, offset: 0.72 },
        { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 },
      ],
      { duration: 1050 * k, delay: 80 * k, easing: 'cubic-bezier(0.7, 0, 0.2, 1)' },
    )
  })

  animate(bg.value, [{ opacity: 1 }, { opacity: 0 }], { duration: 560 * k, delay: 360 * k, easing: 'ease-in-out' })

  // The orange dot flies to the headline and becomes its full stop.
  const dot = leadDot.value
  let flight: Animation | null = null
  if (dot && target) {
    const d = dot.getBoundingClientRect()
    const t = target.getBoundingClientRect()
    const dx = t.left + t.width / 2 - (d.left + d.width / 2)
    const dy = t.top + t.height / 2 - (d.top + d.height / 2)
    const s = t.width / d.width
    flight = animate(
      dot,
      [
        { transform: 'none' },
        { transform: `translate(${dx * 0.42}px, ${dy * 0.42 - 90}px) scale(${(1 + s) / 2 + 0.08})`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
      ],
      { duration: 900 * k, delay: 160 * k, easing: SWING },
    )
  } else {
    flight = animate(dot, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 * k, delay: 300 * k })
  }

  const end = () => emit('done')
  if (flight) flight.finished.then(end, end)
  else end()
}

function skip() {
  exit(true)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Tab' || e.key === 'Shift') return
  skip()
}

onMounted(() => {
  playEntrance()
  holdTimer = window.setTimeout(() => exit(), 3000)
  window.addEventListener('keydown', onKey)
  window.addEventListener('wheel', skip, { passive: true })
  window.addEventListener('touchmove', skip, { passive: true })
})

onBeforeUnmount(() => {
  window.clearTimeout(holdTimer)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('wheel', skip)
  window.removeEventListener('touchmove', skip)
})
</script>

<template>
  <div class="intro" @click="skip">
    <div ref="bg" class="intro__bg"></div>

    <div class="intro__center" aria-hidden="true">
      <div class="intro__mark">
        <span v-for="c in CORNERS" :key="c" ref="cornerEls" class="intro__corner" :class="`intro__corner--${c}`">
          <svg viewBox="221 221 188 188">
            <path d="M245 383v-83a55 55 0 0 1 55-55h85" />
          </svg>
        </span>
        <span v-for="p in INK_DOTS" :key="p" ref="inkDots" class="intro__dot" :class="`intro__dot--${p}`"></span>
        <span ref="ring" class="intro__ring"></span>
        <span ref="leadDot" class="intro__dot intro__dot--lead"></span>
      </div>
      <p class="intro__word">
        <span v-for="(c, i) in WORD" :key="i" ref="chars" class="intro__char">{{ c }}</span>
      </p>
      <p ref="tag" class="intro__tag">台灣遊戲開發者互相試玩的社群</p>
    </div>

    <p class="visually-hidden" role="status">The Game Test Space，台灣遊戲開發者互相試玩的社群</p>
    <button ref="skipBtn" type="button" class="intro__skip hand" @click.stop="skip">跳過動畫 →</button>
  </div>
</template>

<style scoped>
.intro {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  cursor: pointer;
  overflow: hidden;
}
.intro__bg {
  position: absolute;
  inset: 0;
  background-color: var(--wall);
  background-image: var(--grain);
}
.intro__center {
  position: relative;
  display: grid;
  justify-items: center;
  gap: clamp(18px, 3.6vh, 36px);
  padding: 16px;
}
.intro__mark {
  position: relative;
  width: min(44vmin, 320px);
  aspect-ratio: 1;
}

/* Geometry taken from the logo artwork (688-unit box). */
.intro__corner {
  position: absolute;
  width: 27.33%;
  aspect-ratio: 1;
  will-change: transform;
}
.intro__corner svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.intro__corner path {
  fill: none;
  stroke: var(--ink);
  stroke-width: 48;
  stroke-linecap: round;
}
.intro__corner--tl {
  left: 3.63%;
  top: 3.63%;
}
.intro__corner--tr {
  right: 3.63%;
  top: 3.63%;
}
.intro__corner--tr svg {
  transform: rotate(90deg);
}
.intro__corner--br {
  right: 3.63%;
  bottom: 3.63%;
}
.intro__corner--br svg {
  transform: rotate(180deg);
}
.intro__corner--bl {
  left: 3.63%;
  bottom: 3.63%;
}
.intro__corner--bl svg {
  transform: rotate(270deg);
}

.intro__dot,
.intro__ring {
  position: absolute;
  width: 20.35%;
  aspect-ratio: 1;
  border-radius: 50%;
  translate: -50% -50%;
  will-change: transform;
}
.intro__dot {
  background: var(--ink);
}
.intro__dot--l {
  left: 30.67%;
  top: 50%;
}
.intro__dot--r {
  left: 69.33%;
  top: 50%;
}
.intro__dot--b {
  left: 50%;
  top: 69.33%;
}
.intro__dot--lead,
.intro__ring {
  left: 50%;
  top: 30.67%;
}
.intro__dot--lead {
  z-index: 2;
  background: var(--dot);
  box-shadow: 0 2px 3px rgb(23 22 27 / 0.25);
}
.intro__ring {
  border: 3px solid var(--dot);
  opacity: 0;
}

.intro__word {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(1.9rem, 6vw, 4.25rem);
  font-variation-settings: 'opsz' 96;
  letter-spacing: -0.04em;
  line-height: 1;
  white-space: nowrap;
}
.intro__char {
  display: inline-block;
  will-change: transform;
}
.intro__tag {
  font-size: clamp(1rem, 1.6vw, 1.25rem);
  font-weight: 500;
  color: var(--ink-2);
  letter-spacing: 0.04em;
}
.intro__skip {
  position: absolute;
  right: clamp(16px, 3vw, 36px);
  bottom: clamp(16px, 3vh, 32px);
  min-height: 44px;
  padding: 0 12px;
  border: 0;
  background: none;
  font-size: 1.125rem;
  color: var(--ink-2);
  cursor: pointer;
}
.intro__skip:hover {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: var(--dot);
  text-decoration-thickness: 2px;
}
</style>
