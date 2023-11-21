import { ref, unref, computed } from 'vue'
import type { IGraph } from '@/types'
import '@leanix/reporting'
import { format } from 'date-fns'
import { loadGraph, getSubGraphForRefDate } from '@/composables/leanix'

const graph = ref<IGraph>({ edges: {}, nodes: {} })
const refDate = ref(parseInt(format(new Date(), 'yyyyMMdd')))

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
    refDate: computed({
      get: () => unref(refDate),
      set: (value) => (refDate.value = value)
    }),
    graph: computed(() => getSubGraphForRefDate(unref(graph), unref(refDate))),
    initializeReport,
    loadDataset
  }
}

export { useApi }
