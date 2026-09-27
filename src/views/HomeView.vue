<script setup lang="ts">
import { onMounted, ref } from 'vue'

const status = ref('loading...')

onMounted(async () => {
  const res = await fetch('/api/health')
  const data = await res.json()
  status.value = data.status
})
</script>

<template>
  <h1>web2</h1>
  <p>API status: {{ status }}</p>
</template>
