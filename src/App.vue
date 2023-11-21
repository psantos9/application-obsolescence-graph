<template>
  <div class="flex flex-col h-screen">
    <div class="flex justify-left px-8 text-xs">
      <div>
        <label for="refDatew" class="font-semibold leading-6 text-gray-900">Reference Date</label>
        <div>
          <input type="number" v-model="refDate" class="text-sm rounded border border-gray-300 py-1.5" />
        </div>
      </div>
    </div>
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
