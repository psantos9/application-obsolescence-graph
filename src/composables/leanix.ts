import { type Ref } from 'vue'
import QueryApplications from '@/graphql/QueryApplications.gql'
import QueryITComponents from '@/graphql/QueryITComponents.gql'
import type {
  IApplication,
  IITComponent,
  IRelatedFactSheet,
  IRelatedITComponent,
  IGraphEdge,
  TGraphNode,
  IGraph,
  TLifecyclePhase,
  TAggregatedObsolescenceRisk
} from '@/types'

export enum LifecyclePhase {
  undefined,
  eol,
  phaseOut,
  other
}

export enum AggregatedObsolescenceRisk {
  missingITComponent,
  missingLifecycle,
  unaddressedEndOfLife,
  unaddressedPhaseOut,
  riskAccepted,
  riskAddressed,
  noRisk
}

export const getLifecyclePhaseLabel = (lifecyclePhase: LifecyclePhase) =>
  LifecyclePhase[lifecyclePhase] as TLifecyclePhase

export const getAggregatedObsolescenceRiskLabel = (aggregatedObsolescenceRisk: AggregatedObsolescenceRisk) =>
  AggregatedObsolescenceRisk[aggregatedObsolescenceRisk] as TAggregatedObsolescenceRisk

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
    itComponents,
    aggregatedObsolescenceRisk: null,
    aggregatedObsolescenceRiskKey: null
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
    lifecycleKey: null,
    aggregatedLifecycle: null,
    aggregatedLifecycleKey: null
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

const computeAggregatedObsolescenceRiskForApplication = (
  application: IApplication,
  applicationIndex: Record<string, IApplication>,
  itComponentIndex: Record<string, IITComponent>
): AggregatedObsolescenceRisk => {
  const { id, itComponents, children } = application
  if (itComponents.length === 0) return AggregatedObsolescenceRisk.missingITComponent
  const childrenAggregatedObsolescenceRisk = Math.min(
    ...children.map(({ factSheetId }) => applicationIndex?.[factSheetId]?.aggregatedObsolescenceRisk ?? -1)
  )
  if (childrenAggregatedObsolescenceRisk === -1)
    throw new Error(`error while aggregating children for application ${id}`)
  else if (childrenAggregatedObsolescenceRisk === AggregatedObsolescenceRisk.missingITComponent)
    return AggregatedObsolescenceRisk.missingITComponent

  const aggregatedObsolescenceRiskFromITComponents = itComponents.map(({ factSheetId, obsolescenceRiskStatus }) => {
    const aggregatedLifecycle = itComponentIndex[factSheetId]?.aggregatedLifecycle ?? null
    if (aggregatedLifecycle === null) throw new Error(`could not find itcomponent ${factSheetId}`)
    let aggregatedObsolescenceRisk = AggregatedObsolescenceRisk.noRisk
    if (aggregatedLifecycle < LifecyclePhase.other) {
      if (obsolescenceRiskStatus === 'riskAccepted')
        aggregatedObsolescenceRisk = AggregatedObsolescenceRisk.riskAccepted
      else if (obsolescenceRiskStatus === 'riskAddressed')
        aggregatedObsolescenceRisk = AggregatedObsolescenceRisk.riskAddressed
      else if (aggregatedLifecycle === LifecyclePhase.undefined)
        aggregatedObsolescenceRisk = AggregatedObsolescenceRisk.missingLifecycle
      else if (aggregatedLifecycle === LifecyclePhase.phaseOut)
        aggregatedObsolescenceRisk = AggregatedObsolescenceRisk.unaddressedPhaseOut
      else if (aggregatedLifecycle === LifecyclePhase.eol)
        aggregatedObsolescenceRisk = AggregatedObsolescenceRisk.unaddressedEndOfLife
    }
    return aggregatedObsolescenceRisk
  })
  const aggregatedObsolescenceRisk = Math.min(...aggregatedObsolescenceRiskFromITComponents)
  return aggregatedObsolescenceRisk
}

const computeAggregatedObsolescenceRiskForApplications = (
  nodes: Record<string, TGraphNode>
): Record<string, TGraphNode> => {
  const { applicationIndex, itComponentIndex } = Object.values(nodes).reduce(
    (accumulator, node) => {
      if (node.type === 'Application') accumulator.applicationIndex[node.id] = node
      else if (node.type === 'ITComponent') accumulator.itComponentIndex[node.id] = node
      return accumulator
    },
    {
      applicationIndex: {},
      itComponentIndex: {}
    } as { applicationIndex: Record<string, IApplication>; itComponentIndex: Record<string, IITComponent> }
  )

  Object.values(applicationIndex)
    // Sort applications by ascending order of hierarchy (e.g. L3 -> L2 -> L1)
    .sort(({ level: A }, { level: B }) => (A < B ? 1 : A > B ? -1 : 0))
    .forEach((application) => {
      const aggregatedObsolescenceRisk = computeAggregatedObsolescenceRiskForApplication(
        application,
        applicationIndex,
        itComponentIndex
      )
      application.aggregatedObsolescenceRisk = aggregatedObsolescenceRisk
      application.aggregatedObsolescenceRiskKey = getAggregatedObsolescenceRiskLabel(aggregatedObsolescenceRisk)
    })
  return nodes
}

export const getSubGraphForRefDate = (
  graph: IGraph,
  refDate: number,
  filteredApplicationsIndex: Record<string, boolean>,
  outputSubGraph?: Ref<IGraph>
): IGraph => {
  const { edges, nodes } = graph

  // we'll filter out the edges from the original graph that are inactive for the reference date
  const filteredEdges = Object.values(edges).reduce((accumulator: { [edgeId: string]: IGraphEdge }, edge) => {
    const { activeFrom, activeUntil } = edge
    if (activeFrom === null || refDate >= activeFrom) {
      if (activeUntil === null || refDate <= activeUntil) {
        accumulator[edge.id] = edge
      }
    }
    return accumulator
  }, {})

  // we'll only consider in our subgraph the nodes that are linked by active edges
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

  // we'll filter out the ITComponent nodes, from the original graph, that are not linked by an
  // edge in our subgraph
  const filteredNodes = Object.values(nodes).reduce((accumulator: { [nodeId: string]: TGraphNode }, node) => {
    if (node.type === 'Application') {
      const application = { ...node }
      const { id, children, itComponents } = application
      application.children = children.filter(({ id }) => filteredEdges[id] ?? false)
      application.itComponents = itComponents.filter(({ id }) => filteredEdges[id] ?? false)
      accumulator[id] = application
      applicationIndex[id] = application
    } else if (node.type === 'ITComponent' && validNodeIndex[node.id]) {
      const itComponent = { ...node }
      const { id, children, requires } = itComponent
      itComponent.children = children.filter(({ id }) => filteredEdges[id] ?? false)
      itComponent.requires = requires.filter(({ id }) => filteredEdges[id] ?? false)

      accumulator[id] = itComponent
      itComponentIndex[id] = itComponent
    }
    return accumulator
  }, {})

  // First run of indexing to get the set of related factsheets (children and requires) for each ITComponent
  const itComponentLifecycleAndDependenciesIndex = Object.values(itComponentIndex).reduce(
    (accumulator, itComponent) => {
      const { id, missingLifecycle, eol, phaseOut, children, requires } = itComponent
      let lifecyclePhase = LifecyclePhase.other
      if (missingLifecycle) lifecyclePhase = LifecyclePhase.undefined
      else if (typeof eol === 'number' && eol < refDate) lifecyclePhase = LifecyclePhase.eol
      else if (typeof phaseOut === 'number' && phaseOut < refDate) lifecyclePhase = LifecyclePhase.phaseOut
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
    node.lifecycleKey = getLifecyclePhaseLabel(lifecyclePhase)
    node.aggregatedLifecycle = aggregatedLifecyclePhase
    node.aggregatedLifecycleKey = getLifecyclePhaseLabel(aggregatedLifecyclePhase)
  })

  const usedITNodeIndex = Object.values(applicationIndex).reduce((accumulator, { itComponents }) => {
    itComponents.forEach(({ factSheetId }) => {
      const dependencies = itComponentLifecycleAndDependenciesIndex[factSheetId]?.dependencies ?? null
      if (dependencies === null) throw new Error(`could not find dependencies for itComponent ${factSheetId}`)
      accumulator[factSheetId] = true
      dependencies.forEach((factSheetId) => {
        accumulator[factSheetId] = true
      })
      return accumulator
    })
    return accumulator
  }, {} as Record<string, boolean>)

  // We'll exclude itComponent trees that are not connected to any application
  const filteredNodesExcludingITComponentsNotConnectedToApplications = Object.values(filteredNodes).reduce(
    (accumulator, node) => {
      if (node.type === 'Application' || usedITNodeIndex[node.id]) accumulator[node.id] = node
      return accumulator
    },
    {} as Record<string, TGraphNode>
  )

  // This method will fill for each 'Application' node its 'aggregatedObsolescenceRisk'
  // and 'aggregatedObsolescenceRiskKey' field. It mutates the 'filteredNodes' object
  computeAggregatedObsolescenceRiskForApplications(filteredNodesExcludingITComponentsNotConnectedToApplications)
  const filteredNodesExcludingFilteredApplications = Object.values(
    filteredNodesExcludingITComponentsNotConnectedToApplications
  ).reduce((accumulator, node) => {
    if (node.type === 'ITComponent') accumulator[node.id] = node
    else if (node.type === 'Application' && filteredApplicationsIndex[node.id]) accumulator[node.id] = node
    return accumulator
  }, {} as Record<string, TGraphNode>)
  const subGraph = { nodes: filteredNodesExcludingFilteredApplications, edges: filteredEdges }
  if (outputSubGraph) outputSubGraph.value = subGraph
  return subGraph
}
