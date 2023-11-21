import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest'
import { Authenticator, GraphQLClient } from 'leanix-js'
import { writeFile } from 'node:fs/promises'
import { fetchApplications, fetchITComponents, generateGraph } from '@/composables/leanix'
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

  test<LocalTestContext>('loads applications', async (ctx) => {
    const applications = await fetchApplications(ctx.executeGraphQL)
    writeFile('applications.json', JSON.stringify(applications, null, 2))
    console.log(applications)
  }, 100000)

  test<LocalTestContext>('loads it components', async (ctx) => {
    const itComponents = await fetchITComponents(ctx.executeGraphQL)
    writeFile('itComponents.json', JSON.stringify(itComponents, null, 2))
    console.log(itComponents)
  }, 100000)

  test<LocalTestContext>('computes the obsolescence risk for an application', async () => {
    const applications = require('../../__test__/data/applications.json') as IApplication[]
    const itComponents = require('../../__test__/data/itComponents.json') as IITComponent[]
    const graph = generateGraph({ applications, itComponents })
    console.log(graph)
  }, 100000)
})
