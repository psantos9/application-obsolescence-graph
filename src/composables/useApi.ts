import { ref, unref, computed, watch } from 'vue'
import type { IGraph } from '@/types'
import debounce from 'lodash.debounce'
import { format, addMonths, parseISO } from 'date-fns'
import { loadGraph, getSubGraphForRefDate } from '@/composables/leanix'
import '@leanix/reporting'

const debouncedGetSubGraphForRefDate = debounce(getSubGraphForRefDate, 500)

const graph = ref<IGraph>({ edges: {}, nodes: {} })
const subGraph = ref<IGraph>({ edges: {}, nodes: {} })
const refDate = ref(new Date())
const filteredApplicationsIndex = ref<Record<string, boolean>>({})

const getUIConfiguration = (date: Date): lxr.UIMinimalConfiguration => ({
  timeline: {
    type: 'default',
    range: {
      start: addMonths(date, -6).toISOString(),
      end: addMonths(date, 6).toISOString()
    },
    value: {
      dates: [unref(refDate).toISOString()]
    }
  }
})

const initializeReport = async () => {
  await lx.init()
  const config: lxr.ReportConfiguration = {
    facets: [
      {
        key: 'Application',
        label: lx.translateFactSheetType('Application', 'plural'),
        fixedFactSheetType: 'Application',
        callback: (factSheets) => {
          filteredApplicationsIndex.value = factSheets.reduce(
            (accumulator, { id }) => ({ ...accumulator, [id]: true }),
            {}
          )
        }
      }
    ],
    ui: {
      ...getUIConfiguration(unref(refDate)),
      update: ({
        timeline: {
          // @ts-ignore
          value: {
            dates: [date]
          }
        }
      }) => {
        refDate.value = date === 'today' ? new Date() : parseISO(date)
        return {}
      }
    }
  }
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

watch(
  [graph, refDate, filteredApplicationsIndex],
  ([graph, refDate, filteredApplicationsIndex]) => {
    debouncedGetSubGraphForRefDate(
      graph,
      parseInt(format(unref(refDate), 'yyyyMMdd')),
      filteredApplicationsIndex,
      subGraph
    ) ?? { nodes: {}, edges: {} }
  },
  { immediate: true }
)

const useApi = () => {
  return {
    refDate: computed({
      get: () => unref(refDate),
      set: (value) => (refDate.value = value)
    }),
    graph: computed(() => unref(subGraph)),
    initializeReport,
    loadDataset,
    openFactSheetSidePane
  }
}

export { useApi }
