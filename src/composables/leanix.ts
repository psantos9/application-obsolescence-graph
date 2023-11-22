import QueryApplications from '@/graphql/QueryApplications.gql'
import QueryITComponents from '@/graphql/QueryITComponents.gql'
import type {
  IApplication,
  IITComponent,
  IRelatedFactSheet,
  IRelatedITComponent,
  IGraphEdge,
  IGraphNode,
  IGraph
} from '@/types'

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
    name,
    level,
    missingLifecycle,
    children,
    requires
  }
  if (eol !== null) itComponent.eol = eol
  if (phaseOut !== null) itComponent.phaseOut = phaseOut
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
) => {
  const query = QueryApplications.loc?.source.body as string
  const mapFn = mapApplication
  const applications = await fetchFactSheets(executeGraphQL, query, mapFn, updateFn)
  return applications
}

export const fetchITComponents = async (
  executeGraphQL: TLXGraphQLApiClientFn,
  updateFn?: (params: { totalCount: number; downloaded: number }) => void
) => {
  const query = QueryITComponents.loc?.source.body as string
  const mapFn = mapITComponent
  const itComponents = await fetchFactSheets(executeGraphQL, query, mapFn, updateFn)
  return itComponents
}

export const generateGraph = (params: { applications: IApplication[]; itComponents: IITComponent[] }): IGraph => {
  const { applications, itComponents } = params

  const nodes: { [nodeId: string]: IGraphNode } = {}
  const edges: { [edgeId: string]: IGraphEdge } = {}

  applications.forEach((application) => {
    const { id, name, itComponents, children } = application
    const node: IGraphNode = {
      id,
      type: 'Application',
      name
    }
    nodes[node.id] = node
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
  itComponents.forEach((itComponent) => {
    const { id, name, missingLifecycle, eol, phaseOut, children, requires } = itComponent
    const node: IGraphNode = {
      id,
      type: 'ITComponent',
      name,
      missingLifecycle,
      eol,
      phaseOut
    }
    nodes[node.id] = node

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
  const [applications, itComponents] = await Promise.all([
    fetchApplications(executeGraphQL),
    fetchITComponents(executeGraphQL)
  ])
  const graph = generateGraph({ applications, itComponents })
  return graph
}

// TODO: we'll just filter out edges that are not active for the ref date
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

  const filteredNodes = Object.values(nodes).reduce((accumulator: { [nodeId: string]: IGraphNode }, node) => {
    if (node.type === 'Application') accumulator[node.id] = node
    else if (node.type === 'ITComponent' && validNodeIndex[node.id]) accumulator[node.id] = node
    return accumulator
  }, {})
  return { nodes: filteredNodes, edges: filteredEdges }
}

export const computeApplicationObsolescenceRisk = (applicationId: string, refDate: number) => {}
