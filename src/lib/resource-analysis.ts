import { queryMonthlyCost } from './azure-cost'
import type { CostResource } from './azure-cost'

export interface ResourceCostChange {
  resourceName: string
  resourceType: string
  previousCost: number
  currentCost: number
  change: number
  changePercent: number
}

export async function getResourceCostChanges(): Promise<{
  changes: ResourceCostChange[]
  increases: ResourceCostChange[]
  decreases: ResourceCostChange[]
}> {
  const [current, previous] = await Promise.all([
    queryMonthlyCost('ThisMonth'),
    queryMonthlyCost('LastMonth'),
  ])

  const prevMap = new Map<string, { cost: number; type: string }>()
  for (const r of previous.resources) {
    prevMap.set(r.resourceName, { cost: r.cost, type: r.resourceType })
  }

  const currMap = new Map<string, { cost: number; type: string }>()
  for (const r of current.resources) {
    currMap.set(r.resourceName, { cost: r.cost, type: r.resourceType })
  }

  const allNames = new Set([...prevMap.keys(), ...currMap.keys()])
  const changes: ResourceCostChange[] = []

  for (const name of allNames) {
    const prev = prevMap.get(name)?.cost ?? 0
    const currData = currMap.get(name)
    const curr = currData?.cost ?? 0
    if (prev === 0 && curr === 0) continue
    const change = curr - prev
    const changePercent = prev > 0 ? (change / prev) * 100 : curr > 0 ? 100 : 0
    const resourceType = currData?.type || prevMap.get(name)?.type || ''

    changes.push({
      resourceName: name,
      resourceType,
      previousCost: Math.round(prev * 100) / 100,
      currentCost: Math.round(curr * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    })
  }

  changes.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))

  return {
    changes,
    increases: changes.filter((c) => c.changePercent > 20 && c.previousCost > 0).sort((a, b) => b.changePercent - a.changePercent),
    decreases: changes.filter((c) => c.changePercent < -20).sort((a, b) => a.changePercent - b.changePercent),
  }
}

export interface IdleResource {
  resourceName: string
  resourceType: string
  monthlyCost: number
  lastMonthCost: number
  costVariance: number
  reason: string
}

export async function getIdleResources(): Promise<IdleResource[]> {
  const [current, previous] = await Promise.all([
    queryMonthlyCost('ThisMonth'),
    queryMonthlyCost('LastMonth'),
  ])

  const prevMap = new Map<string, number>()
  for (const r of previous.resources) {
    prevMap.set(r.resourceName, r.cost)
  }

  const idle: IdleResource[] = []

  for (const r of current.resources) {
    const prevCost = prevMap.get(r.resourceName)
    if (prevCost === undefined) continue

    const minCost = Math.min(r.cost, prevCost)
    const maxCost = Math.max(r.cost, prevCost)
    const costVariance = maxCost > 0 ? ((maxCost - minCost) / maxCost) * 100 : 0

    // Flag resources with < 15% cost variance (consistent billing = always-on, idle pattern)
    // AND cost > $5/mo (not trivia) AND resource type is compute/storage/network
    const idleTypes = ['microsoft.compute', 'microsoft.storage', 'microsoft.network',
      'microsoft.sql', 'microsoft.dbforpostgresql', 'microsoft.dbformysql',
      'microsoft.cognitiveservices', 'microsoft.app', 'microsoft.containerinstance',
      'microsoft.containerservice', 'microsoft.web', 'microsoft.search',
      'microsoft.cache', 'microsoft.eventhub', 'microsoft.servicebus']
    const typeMatch = idleTypes.some((t) => r.resourceType.toLowerCase().includes(t))

    if (costVariance < 15 && r.cost >= 5 && typeMatch) {
      idle.push({
        resourceName: r.resourceName,
        resourceType: r.resourceType,
        monthlyCost: r.cost,
        lastMonthCost: prevCost,
        costVariance: Math.round(costVariance * 100) / 100,
        reason: costVariance < 5
          ? 'Nearly identical cost month-over-month — resource appears always-on with no usage fluctuation'
          : 'Low cost variance between months — resource likely provisioned but underutilized',
      })
    }
  }

  return idle.sort((a, b) => b.monthlyCost - a.monthlyCost)
}