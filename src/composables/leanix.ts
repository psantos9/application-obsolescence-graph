import QueryApplications from '@/graphql/QueryApplications.gql'
import QueryITComponents from '@/graphql/QueryITComponents.gql'
import type {
  IApplication,
  IITComponent,
  IRelatedFactSheet,
  IRelatedITComponent,
  IGraphEdge,
  IGraphNode
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
  const { id, level, name, lifecycle, relApplicationToITComponent, relToChild } = node
  let eol = lifecycle?.phases?.find(({ phase }: any) => phase === 'endOfLife')?.startDate?.replace(/-/g, '') ?? null
  if (typeof eol === 'string') eol = parseInt(eol)
  const children: IRelatedFactSheet[] = relToChild.edges.map(({ node }: any) => mapRelatedFactSheet(node))
  const itComponents: IRelatedITComponent[] = relApplicationToITComponent.edges.map(({ node }: any) =>
    mapRelApplicationToITComponent(node)
  )
  const application: IApplication = {
    id,
    name,
    level,
    eol,
    children,
    itComponents
  }
  return application
}

export const mapITComponent = (node: any): IITComponent => {
  const { id, level, name, lifecycle, relToChild, relToRequires } = node
  let eol = lifecycle?.phases?.find(({ phase }: any) => phase === 'endOfLife')?.startDate?.replace(/-/g, '') ?? null
  if (typeof eol === 'string') eol = parseInt(eol)
  const children: IRelatedFactSheet[] = relToChild.edges.map(({ node }: any) => mapRelatedFactSheet(node))
  const requires: IRelatedFactSheet[] = relToRequires.edges.map(({ node }: any) => mapRelatedFactSheet(node))
  const itComponent: IITComponent = {
    id,
    name,
    level,
    eol,
    children,
    requires
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

export const generateGraph = (params: {
  applications: IApplication[]
  itComponents: IITComponent[]
}): { nodes: IGraphNode[]; edges: IGraphEdge[] } => {
  const { applications, itComponents } = params

  const nodes: IGraphNode[] = []
  const edges: IGraphEdge[] = []

  applications.forEach((application) => {
    const { id, name, eol, itComponents, children } = application
    const node: INode = {
      id,
      type: 'Application',
      name,
      eol
    }
    nodes.push(node)
    children.forEach((child) => {
      const { id, factSheetId, activeFrom, activeUntil } = child
      const edge: IEdge = {
        id,
        from: application.id,
        to: factSheetId,
        activeFrom,
        activeUntil
      }
      edges.push(edge)
    })
    itComponents.forEach((itComponent) => {
      const { id, factSheetId, activeFrom, activeUntil, obsolescenceRiskStatus } = itComponent
      const edge: IEdge = {
        id,
        from: application.id,
        to: factSheetId,
        activeFrom,
        activeUntil,
        obsolescenceRiskStatus
      }
      edges.push(edge)
    })
  })
  itComponents.forEach((itComponent) => {
    const { id, name, eol, children, requires } = itComponent
    const node: IGraphNode = {
      id,
      type: 'ITComponent',
      name,
      eol
    }
    nodes.push(node)
    children.forEach((child) => {
      const { id, factSheetId, activeFrom, activeUntil } = child
      const edge: IGraphEdge = {
        id,
        from: itComponent.id,
        to: factSheetId,
        activeFrom,
        activeUntil
      }
      edges.push(edge)
    })
    requires.forEach((required) => {
      const { id, factSheetId, activeFrom, activeUntil } = required
      const edge: IGraphEdge = {
        id,
        from: itComponent.id,
        to: factSheetId,
        activeFrom,
        activeUntil
      }
      edges.push(edge)
    })
  })
  return { nodes, edges }
}
