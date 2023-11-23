import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest'
import { Authenticator, GraphQLClient } from 'leanix-js'
import { writeFile } from 'node:fs/promises'
import { fetchApplications, fetchITComponents, generateGraph, getSubGraphForRefDate } from '@/composables/leanix'
import type { IApplication, IITComponent } from '@/types'
const lxr = require('../../lxr.json')

interface LocalTestContext {
  executeGraphQL: (query: string, variables?: string) => any
}

let authenticator: Authenticator | null = null
let graphQLClient: GraphQLClient | null = null

describe('leanix.ts', () => {
  beforeAll(async () => {
    const { host, apitoken } = lxr
    expect(typeof host).toBe('string')
    expect(typeof apitoken).toBe('string')
    authenticator = new Authenticator({ host, apitoken })
    await authenticator.start()
    graphQLClient = new GraphQLClient(authenticator)
  })

  afterAll(async () => {
    await authenticator?.stop()
  })

  beforeEach<LocalTestContext>(async (ctx) => {
    if (graphQLClient === null) throw new Error('GraphQLClient not initialized')
    ctx.executeGraphQL = graphQLClient.executeGraphQL.bind(graphQLClient)
  })

  test.skip<LocalTestContext>('loads applications', async (ctx) => {
    const applicationIndex = await fetchApplications(ctx.executeGraphQL)
    writeFile('applicationIndex.json', JSON.stringify(applicationIndex, null, 2))
  }, 100000)

  test.skip<LocalTestContext>('loads it components', async (ctx) => {
    const itComponentIndex = await fetchITComponents(ctx.executeGraphQL)
    writeFile('itComponentIndex.json', JSON.stringify(itComponentIndex, null, 2))
  }, 100000)

  test<LocalTestContext>('computes the obsolescence risk for an application', async () => {
    const applicationIndex = require('../../__test__/data/applicationIndex.json') as Record<string, IApplication>
    const itComponentIndex = require('../../__test__/data/itComponentIndex.json') as Record<string, IITComponent>
    const graph = generateGraph({ applicationIndex, itComponentIndex })
    const refDate = 20231122
    const subGraph = getSubGraphForRefDate(graph, refDate)
    console.log(subGraph)
  }, 100000)
})
