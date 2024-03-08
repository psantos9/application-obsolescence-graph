<template>
  <div class="flex flex-col h-screen">
    <v-card v-for="(app, i) in applications" :key="i" :app="app" />
  </div>
</template>

<script lang="ts" setup>
import { useApi } from '@/composables/useApi'
import { ref, computed, unref } from 'vue'
import VCard from '@/components/VCard.vue'
import VGraph from '@/components/VGraph.vue'
import './stylesheet.css'

const { initializeReport, loadDataset, graph: dataset } = useApi()

// This could be simplified, made as a composable and exported maybe?
const nodes = computed(() => unref(dataset)?.nodes ?? {})

initializeReport()
loadDataset()

// Only gets apps that have children, this doesn't really give us PARENT applications just yet.
const applications = computed(() =>
  Object.values(unref(nodes)).filter((app) => app.children && app.children.length > 0 && app.type == 'Application')
)
</script>
