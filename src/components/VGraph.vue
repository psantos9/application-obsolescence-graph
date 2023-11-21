<template>
  <v-network-graph ref="graph" :nodes="nodes" :edges="edges" :configs="configs">
    <template #edge-label="{ edge, ...slotProps }">
      <v-edge-label :text="edge.obsolescenceRiskStatus" align="center" vertical-align="above" v-bind="slotProps" />
    </template>
  </v-network-graph>
</template>

<script lang="ts" setup>
import { ref, computed, unref } from 'vue'
import { defineConfigs, type VNetworkGraphInstance, type LayoutHandler, type Node, type Edge } from 'v-network-graph'
import { ForceLayout } from 'v-network-graph/lib/force-layout'
import { useApi } from '@/composables/useApi'

const { graph: dataset } = useApi()
const layoutHandler: LayoutHandler = new ForceLayout()

const graph = ref<VNetworkGraphInstance | null>(null)

const nodes = computed(() => unref(dataset)?.nodes ?? {})
const edges = computed(() => unref(dataset)?.edges ?? {})

const configs = defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    layoutHandler
  },
  node: {
    normal: {
      type: ({ type }) => (type === 'Application' ? 'rect' : 'circle'),
      color: ({ type }) => (type === 'Application' ? 'red' : 'green')
    },
    label: {
      visible: true,
      direction: 'south',
      directionAutoAdjustment: true,
      text: ({ name, eol }) => `${name}${eol !== null ? `\neol: ${eol}` : ''}`
    }
  },
  edge: {
    normal: {
      color: ({ type }) => {
        let color = 'red'
        switch (type) {
          case 'relToChild':
            color = 'blue'
            break
          case 'relToRequires':
            color = 'red'
            break
          case 'relApplicationToITComponent':
            color = 'green'
            break
          default:
            color = 'gray'
        }
        return color
      }
    },
    marker: {
      target: {
        type: 'arrow',
        width: 4,
        height: 4
      }
    }
  }
})
</script>
