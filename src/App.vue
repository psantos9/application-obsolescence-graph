<template>
  <div class="flex flex-col h-screen">
    {{ refDate }}
    <v-graph />
  </div>
</template>

<script lang="ts" setup>
import { useApi } from '@/composables/useApi'
import VGraph from '@/components/VGraph.vue'

const { initializeReport, loadDataset, refDate } = useApi()
initializeReport()
loadDataset()
</script>
