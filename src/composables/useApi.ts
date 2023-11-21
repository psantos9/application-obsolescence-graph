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

const openFactSheetSidePane = async (params: { node: string; event: MouseEvent }) => {
  const { node: factSheetId } = params
  const node = unref(graph).nodes[factSheetId] ?? null
  if (node === null) lx.showToastr('error', `Could not find node id ${factSheetId}`)
  const { type, id } = node
  const relations = [{ name: 'relToChild' }]
  if (type === 'ITComponent') relations.push({ name: 'relToRequires' })
  else if (type === 'Application') relations.push({ name: 'relApplicationToITComponent' })
  lx.openSidePane({
    teste: {
      type: 'FactSheet',
      factSheetId: id,
      factSheetType: type,
      detailFields: [],
      relations,
      pointOfView: {
        id: 'teste',
        changeSet: {
          type: 'dateOnly',
          date: new Date().toISOString()
        }
      }
    }
  })
}

const useApi = () => {
  return {
    refDate: computed({
      get: () => unref(refDate),
      set: (value) => (refDate.value = value)
    }),
    graph: computed(() => getSubGraphForRefDate(unref(graph), unref(refDate))),
    initializeReport,
    loadDataset,
    openFactSheetSidePane
  }
}

export { useApi }
