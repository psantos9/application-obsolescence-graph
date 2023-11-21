<template>
  <v-network-graph ref="graph" :nodes="nodes" :edges="edges" :configs="configs" :layouts="layouts"
    @update:layouts="onUpdateLayouts" />
</template>

<script lang="ts" setup>
import { reactive, ref, computed, unref, watch } from 'vue'
import { defineConfigs, type Layouts, type VNetworkGraphInstance } from 'v-network-graph'
import dagre from '@dagrejs/dagre'
import { useApi } from '@/composables/useApi'

export type TGraphRankDir = 'TB' | 'BT' | 'LR' | 'RL'
export type TGraphAlign = 'UL' | 'UR' | 'DL' | 'DR'

const { graph: dataset } = useApi()
const nodeSize = 40
const rankdir = ref<TGraphRankDir>('BT')
const align = ref<TGraphAlign>('UL')

const graph = ref<VNetworkGraphInstance | null>(null)

const layouts: Layouts = reactive({
  nodes: {}
})
const nodes = computed(() => unref(dataset)?.nodes ?? {})
const edges = computed(() => unref(dataset)?.edges ?? {})

const layout = (rankdir: TGraphRankDir, align: TGraphAlign) => {
  layouts.nodes = {}
  if (Object.keys(unref(nodes)).length <= 1 || Object.keys(unref(edges)).length == 0) return

  // convert graph
  // ref: https://github.com/dagrejs/dagre/wiki
  const g = new dagre.graphlib.Graph()
  // Set an object for the graph label
  g.setGraph({
    rankdir,
    align,
    nodesep: nodeSize * 2,
    edgesep: nodeSize,
    ranksep: nodeSize * 2
  })
  // Default to assigning a new object as a label for each new edge.
  g.setDefaultEdgeLabel(() => ({}))

  // Add nodes to the graph. The first argument is the node id. The second is
  // metadata about the node. In this case we're going to add labels to each of
  // our nodes.
  Object.entries(unref(nodes)).forEach(([nodeId, node]) => {
    g.setNode(nodeId, { label: node.name, width: nodeSize, height: nodeSize })
  })

  // Add edges to the graph.
  Object.values(unref(edges)).forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  g.nodes().forEach((nodeId: string) => {
    // update node position
    const x = g.node(nodeId).x
    const y = g.node(nodeId).y
    layouts.nodes[nodeId] = { x, y }
  })
}

const onUpdateLayouts = () => {
  unref(graph)?.fitToContents()
}

const configs = defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    onBeforeInitialDisplay: () => layout(unref(rankdir), unref(align))
  },
  node: {
    normal: { radius: nodeSize / 2 },
    label: { direction: 'center', color: '#fff' }
  },
  edge: {
    normal: {
      color: '#aaa',
      width: 3
    },
    margin: 4,
    marker: {
      target: {
        type: 'arrow',
        width: 4,
        height: 4
      }
    }
  }
})

watch([dataset, rankdir, align], ([, rankdir, align]) => layout(rankdir, align))
</script>
