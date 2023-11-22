<template>
  <div ref="containerEl" class="h-screen" />
</template>

<script src="https://d3js.org/d3.v6.js" lang="ts" setup>
import { ref, unref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useNodes } from '@/composables/useNodes'
const { initializeReport, applications } = useApi()

const containerEl = ref<HTMLElement | null>(null)

initializeReport()
onMounted(() => {
  const el = unref(containerEl)
  if (el === null) throw new Error('no container element found')
  useNodes(el)
})
</script>
