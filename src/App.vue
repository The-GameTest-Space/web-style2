<script setup lang="ts">
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import LogoIntro from './components/LogoIntro.vue'
import { useIntro } from './composables/useIntro'

const { playing, finish } = useIntro()
</script>

<template>
  <LogoIntro v-if="playing" @done="finish" />
  <SiteHeader />
  <main id="main" tabindex="-1">
    <RouterView />
  </main>
  <SiteFooter />
</template>

<style>
#main:focus {
  outline: none;
}
/* Tilted cards and their viewfinder corners may poke past the gutter; clip
   (not hidden) so no sideways scroll appears and sticky still works. */
#main {
  overflow-x: clip;
}
</style>
