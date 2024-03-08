<script lang="ts" setup>
import { ref, computed, unref } from 'vue'

import VCard from '@/components/VCard.vue'
import { useApi } from '@/composables/useApi'
import type { TGraphNode } from '@/types'

const { graph: dataset } = useApi()
const nodes = computed(() => unref(dataset)?.nodes ?? {})
const collapsed = ref(false)

// Always define type
defineProps<{ node: TGraphNode }>()

// Use two computed attributes

// Render applications first and then IT Components at the bottom

// First section of application, and then IT Component Section. Render conditionally.

// Color code by obsolescense
</script>

<template>
  <div class="flex flex-col border p-4 rounded min-w-[250px] shadow-md">
    <div
      class="text-white flex items-center justify-between p-3 rounded-t"
      :style="{ backgroundColor: node.type === 'Application' ? 'rgb(0, 51, 153)' : 'rgb(192, 0, 0)' }">
      <span class="font-semibold text-lg">{{ node.name }}</span>
      <button
        v-if="node.children?.length ?? 0 > 0"
        class="bg-white text-black text-xs px-2 py-1 rounded"
        @click="collapsed = !collapsed">
        {{ collapsed ? '▶' : '▼' }}
      </button>
    </div>
    <div class="bg-white p-2 flex flex-wrap gap-2 m-2 min-w-[200px]">
      <v-card v-for="(component, i) in node?.itComponents ?? []" :key="i" :app="nodes[component.factSheetId]" />
    </div>

    <div class="flex flex-wrap" v-if="!collapsed">
      <v-card v-for="(childApp, i) in node?.children ?? []" :key="i" :app="nodes[childApp.factSheetId]" />
    </div>
  </div>
</template>
