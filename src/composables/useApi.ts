import { ref, unref, computed } from 'vue'
import type { IGraph } from '@/types'
import '@leanix/reporting'
import { loadGraph } from '@/composables/leanix'

const graph = ref<IGraph | null>(null)

const initializeReport = async () => {
  await lx.init()
  const config: lxr.ReportConfiguration = {}
  await lx.ready(config)
}

const loadDataset = async () => {
  try {
    lx.showSpinner()
    graph.value = await loadGraph(lx.executeGraphQL.bind(lx))
  } finally {
    lx.hideSpinner()
  }
}

const useApi = () => {
  return {
    graph: computed(() => unref(graph)),
    initializeReport,
    loadDataset
  }
}

export { useApi }
