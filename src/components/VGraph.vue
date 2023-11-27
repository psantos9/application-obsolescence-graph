<template>
  <v-network-graph ref="graph" :nodes="nodes" :edges="edges" :configs="configs" :eventHandlers="eventHandlers">
    <template #override-node-label="{ scale, text, config }">
      <text
        x="0"
        y="0"
        :font-size="config.fontSize * scale"
        text-anchor="middle"
        dominant-baseline="central"
        fill="#ffffff">
        {{ text }}
      </text>
    </template>
    <template #edge-label="{ edge, ...slotProps }">
      <v-edge-label
        :text="edge.obsolescenceRiskStatus"
        align="center"
        vertical-align="verticalAlign"
        v-bind="slotProps" />
    </template>
  </v-network-graph>
</template>

<style scoped></style>

<script lang="ts" setup>
import { ref, computed, unref } from 'vue'
import { defineConfigs, type VNetworkGraphInstance, type LayoutHandler, type Node } from 'v-network-graph'
import buildNetwork from 'v-network-graph'
import { ForceLayout } from 'v-network-graph/lib/force-layout'
import { useApi } from '@/composables/useApi'
import { AggregatedObsolescenceRisk } from '@/composables/leanix'

const { graph: dataset, openFactSheetSidePane } = useApi()
const layoutHandler: LayoutHandler = new ForceLayout()

const graph = ref<VNetworkGraphInstance | null>(null)
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

// Dynamically changes text
const pickTextSize = (name: string, type: string): number => {
  let text_size = 10
  if (name.includes('Application')) {
    let index = name.indexOf(' ')
    for (index; index < name.length; index++) {
      text_size -= 1
    }
  } else {
    let index = name.indexOf(' ', 4)
    for (index; index < name.length; index++) {
      text_size -= 1
    }

    if (type == 'ITComponent') {
      text_size -= 1
    }
  }

  return text_size
}
// Dynamically changes size of children components
const pickSize = (name: string, type: string): number => {
  let radius_size = 60
  if (name.includes('Application')) {
    let index = name.indexOf(' ')
    for (index; index < name.length; index++) {
      radius_size -= 5
    }
  } else {
    let index = name.indexOf(' ', 4)
    for (index; index < name.length; index++) {
      radius_size -= 5
    }

    if (type == 'ITComponent') {
      radius_size -= 5
    }
  }

  return radius_size
}

/* For icons later on
const icons = {
  accepted: '&#xe5ca',
  addressed: '&#xe160'
} as Record<string, string> */

const configs = defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    layoutHandler
  },
  node: {
    normal: {
      // If it's a node with children, it'll be bigger than the rest. Right now it shows everything with a child. Rather than the
      // root nodes
      radius: ({ name, type }) => (name && type ? pickSize(name, type) : 50),
      type: ({ type }) => (type === 'ITComponent' ? 'circle' : 'rect'),
      color: ({ type }) => (type === 'Application' ? '#4466cc' : '#ADD8E6')
    },
    label: {
      visible: true,
      direction: 'south',
      directionAutoAdjustment: true,
      fontSize: ({ name, type }) => (name && type ? pickTextSize(name, type) : 8),
      text: ({ name }) => (name ? name : '')
    },

    hover: {
      type: 'circle',
      radius: ({ name, type }) => (name && type ? pickSize(name, type) : 50),
      strokeWidth: 0,
      strokeColor: '#000000',
      strokeDasharray: '0',
      // Checks for whether something is end of life, phaseOut, might wanna involve for the other phases as well. It's also only
      // working for IT Components
      color: ({ eol, phaseOut }) => (eol ? '#c00001' : phaseOut ? '#fcd42c' : '#4466cc')
    }
  },
  edge: {
    normal: {
      width: 3,
      borderRadius: 2,
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
    },
    label: {
      margin: 0,
      fontSize: 11,
      lineHeight: 1.1
    }
  }
})

const eventHandlers = {
  'node:click': openFactSheetSidePane
}
</script>
