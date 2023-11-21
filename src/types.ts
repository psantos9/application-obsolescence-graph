export interface IRelatedFactSheet {
  id: string
  factSheetId: string
  activeFrom: number | null
  activeUntil: number | null
}

export interface IRelatedITComponent extends IRelatedFactSheet {
  obsolescenceRiskStatus: 'riskAccepted' | 'riskAddressed' | null
}

export interface IFactSheet {
  id: string
  name: string
  level: number
  eol: number | null
  children: IRelatedFactSheet[]
}

export interface IApplication extends IFactSheet {
  itComponents: IRelatedITComponent[]
}

export interface IITComponent extends IFactSheet {
  requires: IRelatedFactSheet[]
}

export interface IGraphNode {
  id: string
  type: 'Application' | 'ITComponent'
  name: string
  eol: number | null
}

export interface IGraphEdge {
  id: string
  source: string
  target: string
  activeFrom: number | null
  activeUntil: number | null
  obsolescenceRiskStatus?: 'riskAccepted' | 'riskAddressed' | null
}

export interface IGraph {
  nodes: { [nodeId: string]: IGraphNode }
  edges: { [edgeId: string]: IGraphEdge }
}
