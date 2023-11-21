import { ref, unref, computed } from 'vue'
import type { IApplication } from '@/types'
import '@leanix/reporting'
import { fetchFactSheets } from '@/composables/leanix'

const applications = ref<IApplication[]>([])

const initializeReport = async () => {
  await lx.init()
  fetchFactSheets(lx.executeGraphQL.bind(lx))
  const config: lxr.ReportConfiguration = {
    facets: [
      {
        key: 'Applications',
        fixedFactSheetType: 'Application',
        attributes: ['name'],
        callback: (dataset: unknown) => {
          if (!Array.isArray(dataset)) throw new Error('invalid dataset')
          applications.value = dataset.map(({ id, name }) => ({ id, name }))
        }
      }
    ]
  }
  await lx.ready(config)
}

const useApi = () => {
  return {
    applications: computed(() => unref(applications)),
    initializeReport
  }
}

export { useApi }
