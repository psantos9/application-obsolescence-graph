<template>
  <v-network-graph ref="graph" :nodes="nodes" :edges="edges" :configs="configs" />
</template>

<script lang="ts" setup>
import { ref, computed, unref } from 'vue'
import { defineConfigs, type VNetworkGraphInstance, type LayoutHandler } from 'v-network-graph'
import { ForceLayout } from 'v-network-graph/lib/force-layout'
import { useApi } from '@/composables/useApi'

const { graph: dataset } = useApi()
const layoutHandler: LayoutHandler = new ForceLayout()

const graph = ref<VNetworkGraphInstance | null>(null)

const nodes = computed(() => unref(dataset)?.nodes ?? {})
const edges = computed(() => unref(dataset)?.edges ?? {})

const configs = defineConfigs({
  view: {
    layoutHandler
  }
})
</script>
