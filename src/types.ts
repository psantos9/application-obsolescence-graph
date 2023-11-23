import { LifecyclePhase, AggregatedObsolescenceRisk } from '@/composables/leanix'

export type TLifecyclePhase = keyof typeof LifecyclePhase
export type TAggregatedObsolescenceRisk = keyof typeof AggregatedObsolescenceRisk

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
  children: IRelatedFactSheet[]
}

export interface IApplication extends IFactSheet {
  type: 'Application'
  itComponents: IRelatedITComponent[]
  aggregatedObsolescenceRisk: AggregatedObsolescenceRisk | null
  aggregatedObsolescenceRiskKey: TAggregatedObsolescenceRisk | null
}

export interface IITComponent extends IFactSheet {
  type: 'ITComponent'
  missingLifecycle: boolean
  eol: number | null
  phaseOut: number | null
  requires: IRelatedFactSheet[]
  lifecycle: LifecyclePhase | null
  lifecycleKey: TLifecyclePhase | null
  aggregatedLifecycle: LifecyclePhase | null
  aggregatedLifecycleKey: TLifecyclePhase | null
}

export type TGraphNode = IITComponent | IApplication

export interface IGraphEdge {
  id: string
  type: 'relToChild' | 'relToRequires' | 'relApplicationToITComponent'
  source: string
  target: string
  activeFrom: number | null
  activeUntil: number | null
  obsolescenceRiskStatus?: 'riskAccepted' | 'riskAddressed' | null
}

export interface IGraph {
  nodes: { [nodeId: string]: TGraphNode }
  edges: { [edgeId: string]: IGraphEdge }
}
