<template>
  <v-network-graph ref="graph" :nodes="nodes" :edges="edges" :configs="configs" :eventHandlers="eventHandlers">
    <template #override-node-label="{ scale, text, config }">
      <text
        x="0"
        y="0"
        :font-size="config.fontSize * scale"
        text-anchor="middle"
        dominant-baseline="central"
        fill="white">
        {{ text }}
      </text>
    </template>
    <template #edge-overlay="{ edge, scale, length, pointAtLength }">
      <g class="edge-icon">
        <!-- length: The total length of the edge. -->
        <circle
          :cx="pointAtLength(length - 40 * scale).x"
          :cy="pointAtLength(length - 40 * scale).y"
          :r="
            edge.obsolescenceRiskStatus === 'riskAddressed'
              ? 10 * scale
              : edge.obsolescenceRiskStatus === 'riskAccepted'
              ? 10 * scale
              : 0
          "
          stroke="#444"
          :stroke-width="1 * scale"
          :fill="
            edge.obsolescenceRiskStatus === 'riskAddressed'
              ? '#54c45e'
              : edge.obsolescenceRiskStatus === 'riskAccepted'
              ? '#ff80df'
              : ''
          " />
        <text
          v-bind="pointAtLength(length - 40 * scale)"
          font-family="Material Icons"
          text-anchor="middle"
          dominant-baseline="central"
          :font-size="16 * scale"
          v-html="icons[edge.obsolescenceRiskStatus]" />
      </g>
    </template>
  </v-network-graph>
</template>

<style scoped>
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/materialicons/v97/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2) format('woff2');
}
.edge-icon {
  pointer-events: none;
}
</style>

<script lang="ts" setup>
import { ref, computed, unref } from 'vue'
import { defineConfigs, type VNetworkGraphInstance, type LayoutHandler, type Node } from 'v-network-graph'
import { ForceLayout } from 'v-network-graph/lib/force-layout'
import { useApi } from '@/composables/useApi'

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

// Chooses a color based on the application or IT component
const pickColor = (type: string, risk: string, phaseOut?: string, eol?: string): string => {
  let color = ''
  if (type == 'Application') {
    if (risk == 'missingITComponent') {
      color = '#8590a1'
    } else if (risk == 'noRisk') {
      color = '#baf3db'
    } else if (risk == 'unaddressedEndOfLife') {
      color = '#f87168'
    } else if (risk == 'unaddressedPhaseOut') {
      color = '#fea363'
    } else if (risk == 'missingLifecycle') {
      color = '#ededef'
    }
  } else {
    if (eol) {
      color = '#c00001'
    } else if (phaseOut) {
      color = '#fcd42c'
    } else if (risk == 'phaseIn') {
      color = '#e7f9ff'
    } else if (risk == 'active') {
      color = '#cce0ff'
    } else if (risk == 'plan') {
      color = '#f4f0ff'
    }
  }
  return color
}
// Dynamically changes text, will not use this, I want all nodes to be of the same size
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

// Icons that'll display whether the risk was addressed or accepted
const icons = {
  riskAccepted: '&#xe86c',
  riskAddressed: '&#xf091'
} as Record<string, string>

const configs = defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    layoutHandler
  },
  node: {
    normal: {
      radius: 32,
      // for type is "rect" -->
      width: 64,
      height: 64,
      type: ({ type }) => (type === 'ITComponent' ? 'circle' : 'rect'),
      color: ({ type, aggregatedObsolescenceRiskKey, aggregatedLifecycleKey, lifecycleKey, eol, phaseOut }) =>
        aggregatedObsolescenceRiskKey
          ? pickColor(type, aggregatedObsolescenceRiskKey, eol, phaseOut)
          : aggregatedLifecycleKey
          ? pickColor(type, aggregatedLifecycleKey, eol, phaseOut)
          : pickColor(type, lifecycleKey, eol, phaseOut)
    },
    label: {
      visible: true,
      direction: 'south',
      directionAutoAdjustment: true,
      fontSize: 7,
      text: ({ name }) => (name ? name : '')
    },

    hover: {
      type: ({ type }) => (type === 'ITComponent' ? 'circle' : 'rect'),
      radius: 32,
      // for type is "rect" -->
      width: 64,
      height: 64,
      strokeWidth: 0,
      strokeColor: '#000000',
      strokeDasharray: '0',
      color: ({ type, aggregatedObsolescenceRiskKey, aggregatedLifecycleKey, lifecycleKey, eol, phaseOut }) =>
        aggregatedObsolescenceRiskKey
          ? pickColor(type, aggregatedObsolescenceRiskKey, eol, phaseOut)
          : aggregatedLifecycleKey
          ? pickColor(type, aggregatedLifecycleKey, eol, phaseOut)
          : pickColor(type, lifecycleKey, eol, phaseOut)
    }
  },
  edge: {
    normal: {
      gap: 10,
      width: ({ type }) => (type === 'relToRequires' ? 1 : 3),
      borderRadius: 2,
      dasharray: ({ type }) => (type === 'relToChild' ? '4' : '0'),
      color: ({ type }) => {
        let color = ''
        switch (type) {
          case 'relToChild':
            color = '#1171e5'
            break
          case 'relToRequires':
            color = '#fcce15'
            break
          case 'relApplicationToITComponent':
            color = '#e71413'
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
        height: 4,
        margin: -1
      }
    },
    hover: {
      width: 4,
      borderRadius: 2,
      dasharray: ({ type }) => (type === 'relToChild' ? '4' : '0'),
      color: ({ type }) => {
        let color = ''
        switch (type) {
          case 'relToChild':
            color = '#1171e5'
            break
          case 'relToRequires':
            color = '#fcce15'
            break
          case 'relApplicationToITComponent':
            color = '#e71413'
            break
          default:
            color = 'gray'
        }
        return color
      }
    }
  }
})

const eventHandlers = {
  'node:click': openFactSheetSidePane
}
</script>
