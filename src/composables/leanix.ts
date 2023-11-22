import QueryApplications from '@/graphql/QueryApplications.gql'
import QueryITComponents from '@/graphql/QueryITComponents.gql'
import type {
  IApplication,
  IITComponent,
  IRelatedFactSheet,
  IRelatedITComponent,
  IGraphEdge,
  TGraphNode,
  IGraph
} from '@/types'

export enum LifecyclePhase {
  UNDEFINED,
  END_OF_LIFE,
  PHASE_OUT,
  OTHER
}

export enum AggregatedObsolescenceRisk {
  MISSING_LIFECYCLE_INFO,
  UNADDRESSED_END_OF_LIFE,
  UNADDRESSED_PHASE_OUT,
  MISSING_IT_COMPONENT_INFO,
  RISK_ACCEPTED,
  RISK_ADDRESSED,
  NO_RISK
}

export type TLXGraphQLApiClientFn = (query: string, variables?: string) => Promise<any>

export const mapRelApplicationToITComponent = ({
  id,
  activeFrom,
  activeUntil,
  factSheet: { id: factSheetId },
  obsolescenceRiskStatus
}: any): IRelatedITComponent => ({
  id,
  factSheetId,
  activeFrom: activeFrom === null ? null : parseInt(activeFrom.replace(/-/g, '')),
  activeUntil: activeUntil === null ? null : parseInt(activeUntil.replace(/-/g, '')),
  obsolescenceRiskStatus
})

export const mapRelatedFactSheet = ({
  id,
  activeFrom,
  activeUntil,
  factSheet: { id: factSheetId }
}: any): IRelatedFactSheet => ({
  id,
  factSheetId,
  activeFrom: activeFrom === null ? null : parseInt(activeFrom.replace(/-/g, '')),
  activeUntil: activeUntil === null ? null : parseInt(activeUntil.replace(/-/g, ''))
})

export const mapApplication = (node: any): IApplication => {
  const { id, level, name, relApplicationToITComponent, relToChild } = node
  const children: IRelatedFactSheet[] = relToChild.edges.map(({ node }: any) => mapRelatedFactSheet(node))
  const itComponents: IRelatedITComponent[] = relApplicationToITComponent.edges.map(({ node }: any) =>
    mapRelApplicationToITComponent(node)
  )
  const application: IApplication = {
    id,
    type: 'Application',
    name,
    level,
    children,
    itComponents
  }
  return application
}

export const mapITComponent = (node: any): IITComponent => {
  const { id, level, name, lifecycle, relToChild, relToRequires } = node
  const missingLifecycle = lifecycle === null
  let eol = lifecycle?.phases?.find(({ phase }: any) => phase === 'endOfLife')?.startDate?.replace(/-/g, '') ?? null
  if (typeof eol === 'string') eol = parseInt(eol)
  let phaseOut = lifecycle?.phases?.find(({ phase }: any) => phase === 'phaseOut')?.startDate?.replace(/-/g, '') ?? null
  if (typeof phaseOut === 'string') phaseOut = parseInt(phaseOut)

  const children: IRelatedFactSheet[] = relToChild.edges.map(({ node }: any) => mapRelatedFactSheet(node))
  const requires: IRelatedFactSheet[] = relToRequires.edges.map(({ node }: any) => mapRelatedFactSheet(node))
  const itComponent: IITComponent = {
    id,
    type: 'ITComponent',
    name,
    level,
    missingLifecycle,
    eol,
    phaseOut,
    children,
    requires,
    lifecycle: null,
    aggregatedLifecycle: null
  }
  return itComponent
}

export const fetchFactSheetsPage = async <T>(params: {
  executeGraphQL: TLXGraphQLApiClientFn
  mapNodeFn: (node: any) => T
  query: string
  first?: number
  after?: string | null
}): Promise<{ totalCount: number; hasNextPage: boolean; endCursor: string; factSheets: T[] }> => {
  const { executeGraphQL, query, mapNodeFn, first = null, after = null } = params
  const {
    totalCount,
    pageInfo: { hasNextPage, endCursor },
    edges
  } = await executeGraphQL(query, JSON.stringify({ first, after })).then(({ allFactSheets }) => allFactSheets)
  const factSheets = edges.map(({ node }: any) => mapNodeFn(node))
  return { totalCount, hasNextPage, endCursor, factSheets }
}

export const fetchFactSheets = async <T>(
  executeGraphQL: TLXGraphQLApiClientFn,
  query: string,
  mapNodeFn: (node: any) => T,
  updateFn?: (params: { totalCount: number; downloaded: number }) => void
): Promise<T[]> => {
  let hasNextPage = true
  const factSheets: T[] = []
  let page: T[] = []
  let after: null | string = null
  let totalCount: null | number = null
  do {
    ;({
      totalCount,
      hasNextPage,
      factSheets: page,
      endCursor: after
    } = await fetchFactSheetsPage<T>({ executeGraphQL, query, mapNodeFn, first: 15000, after }))
    factSheets.push(...page)
    updateFn?.({ totalCount, downloaded: factSheets.length })
  } while (hasNextPage)
  return factSheets
}

export const fetchApplications = async (
  executeGraphQL: TLXGraphQLApiClientFn,
  updateFn?: (params: { totalCount: number; downloaded: number }) => void
): Promise<{ [applicationId: string]: IApplication }> => {
  const query = QueryApplications.loc?.source.body as string
  const mapFn = mapApplication
  const applications = await fetchFactSheets(executeGraphQL, query, mapFn, updateFn)
  const applicationIndex = applications.reduce((accumulator, application) => {
    accumulator[application.id] = application
    return accumulator
  }, {} as { [applicationId: string]: IApplication })
  return applicationIndex
}

export const fetchITComponents = async (
  executeGraphQL: TLXGraphQLApiClientFn,
  updateFn?: (params: { totalCount: number; downloaded: number }) => void
): Promise<{ [itComponentId: string]: IITComponent }> => {
  const query = QueryITComponents.loc?.source.body as string
  const mapFn = mapITComponent
  const itComponents = await fetchFactSheets(executeGraphQL, query, mapFn, updateFn)
  const itComponentIndex = itComponents.reduce((accumulator, itComponent) => {
    accumulator[itComponent.id] = itComponent
    return accumulator
  }, {} as { [itComponentId: string]: IITComponent })
  return itComponentIndex
}

export const generateGraph = (params: {
  applicationIndex: Record<string, IApplication>
  itComponentIndex: Record<string, IITComponent>
}): IGraph => {
  const { applicationIndex, itComponentIndex } = params

  const nodes: { [nodeId: string]: TGraphNode } = {}
  const edges: { [edgeId: string]: IGraphEdge } = {}

  Object.values(applicationIndex).forEach((application) => {
    const { id, itComponents, children } = application
    nodes[id] = application
    children.forEach((child) => {
      const { id, factSheetId, activeFrom, activeUntil } = child
      const edge: IGraphEdge = {
        id,
        type: 'relToChild',
        source: factSheetId,
        target: application.id,
        activeFrom,
        activeUntil
      }
      edges[edge.id] = edge
    })
    itComponents.forEach((itComponent) => {
      const { id, factSheetId, activeFrom, activeUntil, obsolescenceRiskStatus } = itComponent
      const edge: IGraphEdge = {
        id,
        type: 'relApplicationToITComponent',
        source: factSheetId,
        target: application.id,
        activeFrom,
        activeUntil,
        obsolescenceRiskStatus
      }
      edges[edge.id] = edge
    })
  })
  Object.values(itComponentIndex).forEach((itComponent) => {
    const { id, children, requires } = itComponent
    nodes[id] = itComponent

    children.forEach((child) => {
      const { id, factSheetId, activeFrom, activeUntil } = child
      const edge: IGraphEdge = {
        id,
        type: 'relToChild',
        source: factSheetId,
        target: itComponent.id,
        activeFrom,
        activeUntil
      }
      edges[edge.id] = edge
    })
    requires.forEach((required) => {
      const { id, factSheetId, activeFrom, activeUntil } = required
      const edge: IGraphEdge = {
        id,
        type: 'relToRequires',
        source: factSheetId,
        target: itComponent.id,
        activeFrom,
        activeUntil
      }
      edges[edge.id] = edge
    })
  })
  return { nodes, edges }
}

export const loadGraph = async (executeGraphQL: TLXGraphQLApiClientFn) => {
  const [applicationIndex, itComponentIndex] = await Promise.all([
    fetchApplications(executeGraphQL),
    fetchITComponents(executeGraphQL)
  ])
  const graph = generateGraph({ applicationIndex, itComponentIndex })
  return graph
}

// Recursive method for getting the related factsheet ids of an ITComponent (children, requires)
const getITComponentDependencies = (
  relations: IRelatedFactSheet[],
  dependencies: Set<string>,
  itComponentIndex: Record<string, IITComponent>
) => {
  relations.forEach(({ factSheetId }) => {
    if (!dependencies.has(factSheetId)) {
      dependencies.add(factSheetId)
      const itComponent = itComponentIndex[factSheetId] ?? null
      if (itComponent === null) throw new Error(`invalid it component id ${factSheetId}`)
      const { children, requires } = itComponent
      getITComponentDependencies(Array.from([...children, ...requires]), dependencies, itComponentIndex)
    }
  })
  return dependencies
}

export const getSubGraphForRefDate = (graph: IGraph, refDate: number): IGraph => {
  const { edges, nodes } = graph
  const filteredEdges = Object.values(edges).reduce((accumulator: { [edgeId: string]: IGraphEdge }, edge) => {
    const { activeFrom, activeUntil } = edge
    if (activeFrom === null || refDate >= activeFrom) {
      if (activeUntil === null || refDate <= activeUntil) {
        accumulator[edge.id] = edge
      }
    }
    return accumulator
  }, {})

  const validNodeIndex = Object.values(filteredEdges).reduce(
    (accumulator: Record<string, boolean>, { source, target }) => {
      accumulator[source] = true
      accumulator[target] = true
      return accumulator
    },
    {}
  )

  const applicationIndex: Record<string, IApplication> = {}
  const itComponentIndex: Record<string, IITComponent> = {}

  const filteredNodes = Object.values(nodes).reduce((accumulator: { [nodeId: string]: TGraphNode }, node) => {
    if (node.type === 'Application') {
      accumulator[node.id] = node
      applicationIndex[node.id] = node
    } else if (node.type === 'ITComponent' && validNodeIndex[node.id]) {
      accumulator[node.id] = node
      itComponentIndex[node.id] = node
    }
    return accumulator
  }, {})

  // First run of indexing to get the set of related factsheets (children and requires) for each ITComponent
  const itComponentLifecycleAndDependenciesIndex = Object.values(itComponentIndex).reduce(
    (accumulator, itComponent) => {
      const { id, missingLifecycle, eol, phaseOut, children, requires } = itComponent
      let lifecyclePhase = LifecyclePhase.OTHER
      if (missingLifecycle) lifecyclePhase = LifecyclePhase.UNDEFINED
      else if (typeof eol === 'number' && eol < refDate) lifecyclePhase = LifecyclePhase.END_OF_LIFE
      else if (typeof phaseOut === 'number' && phaseOut < refDate) lifecyclePhase = LifecyclePhase.PHASE_OUT
      const dependencies = Array.from(
        getITComponentDependencies(Array.from([...children, ...requires]), new Set(), itComponentIndex)
      )
      accumulator[id] = { id, lifecyclePhase, dependencies }
      return accumulator
    },
    {} as Record<
      string,
      {
        id: string
        lifecyclePhase: LifecyclePhase
        dependencies: string[]
      }
    >
  )

  // On the second run of indexing we'll aggregate the lifecycle for each IT Component, given its own and
  // the lifecycle of the related/underlying IT Components
  Object.values(itComponentLifecycleAndDependenciesIndex).forEach((itComponent) => {
    const { id, lifecyclePhase, dependencies } = itComponent
    const dependenciesLifecyclePhases = dependencies.map(
      (factSheetId) => itComponentLifecycleAndDependenciesIndex[factSheetId]?.lifecyclePhase ?? -1
    )
    const aggregatedLifecyclePhase = Math.min(lifecyclePhase, ...dependenciesLifecyclePhases)
    if (aggregatedLifecyclePhase === -1)
      throw new Error(`error while aggregating lifecycle phase for itComponent ${id}`)
    const node = (filteredNodes[itComponent.id] as IITComponent) ?? null
    if (node === null) throw new Error(`error while setting lifecycle value for itComponent ${id}`)
    node.lifecycle = lifecyclePhase
    node.aggregatedLifecycle = aggregatedLifecyclePhase
  })
  return { nodes: filteredNodes, edges: filteredEdges }
}

export const getITComponentIndexFromGraph = (
  graph: IGraph,
  itComponentIndex: { [id: string]: IITComponent },
  applicationIndex: { [id: string]: IApplication },
  refDate: number
) => {
  const indexes = Object.values(graph.nodes).reduce(
    (accumulator, node) => {
      if (node.type === 'ITComponent') {
        const itComponent = itComponentIndex[node.id] ?? null
        if (itComponent === null) throw new Error(`invalid it component id ${node.id}`)
        accumulator.itComponents[itComponent.id] = itComponent
      } else if (node.type === 'Application') {
        const application = applicationIndex[node.id] ?? null
        if (application === null) throw new Error(`invalid application id ${node.id}`)
        accumulator.applications[application.id] = application
      }
      return accumulator
    },
    { itComponents: {}, applications: {} } as {
      itComponents: Record<string, IITComponent>
      applications: Record<string, IApplication>
    }
  )

  console.log('GRAPH', graph, indexes)
}

export const computeApplicationObsolescenceRisk = (applicationId: string, refDate: number) => {}
