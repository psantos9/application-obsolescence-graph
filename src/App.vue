<template>
  <div class="flex flex-col">
    <div class="font-bold sticky top-0 bg-white py-2">
      {{ applications.length }} Application{{ applications.length === 1 ? '' : 's' }}
    </div>
    <div class="flex flex-wrap gap-2 text-xs">
      <div v-for="application in applications" :key="application.id" class="shadow rounded p-1 bg-gray-100">
        {{ application.name }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useApi } from '@/composables/useApi'

const { initializeReport, applications } = useApi()

initializeReport()
</script>
