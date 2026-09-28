<script setup lang="ts">
// An event's title as text, with the word Steam marked: a marker underlay in
// Steam's blue, the word set in capitals as the platform writes it.
// Only the look changes; the text stays "Steam" for search and screen readers.
import { computed } from 'vue'

const props = defineProps<{ text: string }>()

// The first Steam only, as a whole word (not Steamworks or SteamVR): a title
// that names it twice, like Steam 新品節（Steam Next Fest）, is marked once.
// The word is always parts[1].
const parts = computed(() => {
  const m = props.text.match(/\bSteam\b/i)
  if (m?.index === undefined) return [props.text]
  const end = m.index + m[0].length
  return [props.text.slice(0, m.index), m[0], props.text.slice(end)]
})
</script>

<template>
  <template v-for="(part, i) in parts" :key="i">
    <span v-if="i % 2" class="steam">{{ part }}</span>
    <template v-else>{{ part }}</template>
  </template>
</template>

<style scoped>
.steam {
  position: relative;
  isolation: isolate;
  padding-inline: 0.16em;
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
}
/* The swipe: an underlay over the bottom third of the capitals, a little
   crooked, drawn left to right once when the title appears. In Bricolage
   the baseline is 1.05em from the top of the box and capitals are 0.73em
   tall, so the band runs from 0.81em to just below the baseline. */
.steam::before {
  content: '';
  position: absolute;
  inset: 0.81em -0.06em auto;
  height: 0.27em;
  z-index: -1;
  /* Steam's own light blue, the one colour here from outside the site: it
     says Steam at a glance and stays clear of the orange that marks
     deadlines. */
  background: #66c0f4;
  border-radius: 0.1em 0.2em 0.12em 0.24em / 0.2em 0.12em 0.2em 0.14em;
  transform: rotate(-1deg) skewX(-10deg);
  animation: swipe 0.5s var(--ease-out) 0.15s both;
}
@keyframes swipe {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .steam::before {
    animation: none;
  }
}
</style>
