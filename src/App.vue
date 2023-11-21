<template>
  <div class="flex flex-col h-screen">
    <force-graph />
  </div>
</template>

<script lang="ts" setup>
import { useApi } from '@/composables/useApi'
import ForceGraph from '@/components/ForceGraph.vue'

const { initializeReport, loadDataset } = useApi()
initializeReport()
loadDataset()
</script>
