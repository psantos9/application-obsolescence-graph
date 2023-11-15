import { DataSet } from 'vis-data/peer'
import { Network } from 'vis-network/peer'
import { Edge } from 'vis-network'
import { ref, unref, computed } from 'vue'
import 'vis-network/styles/vis-network.css'

// Function that initializes network given the information given
const useNodes = () => {
  // Creates an array of nodes, later on I want to make this dynamic
  const createNodes = new DataSet([
    { id: 1, label: 'Application 1' },
    { id: 2, label: 'Application 2' },
    { id: 3, label: 'Application 3' },
    { id: 4, label: 'Application 4' },
    { id: 5, label: 'Application 5' }
  ])

  // DataSet accepts items that have an optional id, so I used Edge instead
  const createEdges: Edge[] = [
    { from: 1, to: 3 },
    { from: 1, to: 2 },
    { from: 2, to: 4 },
    { from: 2, to: 5 },
    { from: 3, to: 3 }
  ]

  const container = document.getElementById('mynetwork')

  const data = {
    nodes: createNodes,
    edges: createEdges
  }

  const options = {}
  const network = new Network(container, data, options)

  return {}
}

export { useNodes }
