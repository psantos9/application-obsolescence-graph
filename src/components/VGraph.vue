<template>
  <v-network-graph ref="graph" :nodes="nodes" :edges="edges" :configs="configs" :eventHandlers="eventHandlers">
    <template #override-node-label="{ scale, text }">
      <text x="0" y="0" :font-size="8 * scale" text-anchor="middle" dominant-baseline="central" fill="#ffffff">
        {{ text }}
      </text>
    </template>
    <template #edge-label="{ edge, ...slotProps }">
      <v-edge-label :text="edge.obsolescenceRiskStatus" align="center" vertical-align="above" v-bind="slotProps" />
    </template>
  </v-network-graph>
</template>

<script lang="ts" setup>
import { ref, computed, unref } from 'vue'
import { defineConfigs, type VNetworkGraphInstance, type LayoutHandler, type Node } from 'v-network-graph'
import { ForceLayout } from 'v-network-graph/lib/force-layout'
import { useApi } from '@/composables/useApi'
import dagre from '@dagrejs/dagre'

const { graph: dataset, openFactSheetSidePane } = useApi()
const layoutHandler: LayoutHandler = new ForceLayout()

const graph = ref<VNetworkGraphInstance | null>(null)

// Make references for tooltip, it's opacity, and the targetNode
const tooltip = ref<HTMLDivElement>()
const tooltipOpacity = ref(0)
const targetNodeId = ref<string>('')
const tooltipPos = ref({ left: '0px', top: '0px' })

const nodes = computed(() => unref(dataset)?.nodes ?? {})
const edges = computed(() => unref(dataset)?.edges ?? {})

const getNodeLabel = (node: Node): string => {
  const {
    type,
    name = '',
    missingLifecycle,
    eol,
    phaseOut,
    aggregatedObsolescenceRiskKey,
    lifecycleKey,
    aggregatedLifecycleKey,
    children,
    requires
  } = node

  // Not sure if I'll need this
  const label: string[] = [name]
  if (type === 'ITComponent') {
    if (missingLifecycle) label.push('missingLifecycle')
    else {
      if (children.length + requires.length > 0) label.push(`aggregatedLifecycle: ${aggregatedLifecycleKey}`)
      label.push(`lifecycle: ${lifecycleKey}`)
      if (eol) label.push(`eol: ${eol}`)
      else if (phaseOut) label.push(`phaseOut: ${aggregatedLifecycleKey}`)
    }
  } else if (type === 'Application') {
    label.push(aggregatedObsolescenceRiskKey)
  }
  return label.join('\n')
}

// For icons later on
const icons = {
  accepted: '&#xe5ca',
  addressed: '&#xe160'
} as Record<string, string>

const configs = defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    layoutHandler
  },
  node: {
    normal: {
      // If it's a node with children, it'll be bigger than the rest. Right now it shows everything with a child. Rather than the
      // root nodes
      radius: ({ children }) => (children.length > 0 ? 48 : 38),
      type: 'circle',
      color: ({ type }) => (type === 'Application' ? '#4466cc' : '#ADD8E6')
    },
    label: {
      visible: true,
      direction: 'south',
      directionAutoAdjustment: true,
      margin: 4
      // text: getNodeLabel
    },
    hover: {
      type: 'circle',
      radius: 40,
      strokeWidth: 0,
      strokeColor: '#000000',
      strokeDasharray: '0',
      // Checks for whether something is end of life, phaseOut, might wanna involve for the other phases as well. It's also only
      // working for IT Components
      color: ({ eol, phaseOut }) => (eol ? '#f87168' : phaseOut ? '#fea363' : 'grey')
    }
  },
  edge: {
    normal: {
      width: 3,
      dasharray: ({ type }) => (type === 'relToChild' ? 10 : 0),
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

const eventHandlers = {
  'node:click': openFactSheetSidePane
}
</script>
