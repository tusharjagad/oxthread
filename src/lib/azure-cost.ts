import { prisma } from '@/lib/prisma'

const COST_API_VERSION = '2023-08-01'

export interface CostQueryResult {
  totalCost: number
  forecast: number | null
  currency: string
  resources: CostResource[]
  dailyCosts: DailyCost[]
  periodStart: string
  periodEnd: string
}

export interface CostResource {
  resourceId: string
  resourceName: string
  resourceType: string
  location: string | null
  cost: number
  currency: string
  meterCategory: string | null
  meterSubCategory: string | null
}

export interface DailyCost {
  date: string
  cost: number
}

export interface Recommendation {
  resourceId: string
  resourceName: string
  recommendationType: string
  impact: number
  currency: string
  description: string | null
  action: string | null
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET
  const tenantId = process.env.AZURE_TENANT_ID

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Azure credentials not configured')
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://management.azure.com/.default',
        grant_type: 'client_credentials',
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Azure auth failed: ${err}`)
  }

  const data = await res.json()
  return data.access_token
}

function buildCostQuery(timeframe: 'ThisMonth' | 'LastMonth') {
  const range = getMonthDateRange(timeframe === 'ThisMonth' ? 0 : -1)
  return {
    type: 'ActualCost',
    timeframe: 'Custom',
    timePeriod: { from: range.from, to: range.to },
    dataset: {
      granularity: 'Daily',
      aggregation: {
        totalCost: { name: 'PreTaxCost', function: 'Sum' },
      },
      grouping: [
        { type: 'Dimension', name: 'ResourceId' },
        { type: 'Dimension', name: 'ResourceType' },
        { type: 'Dimension', name: 'ResourceLocation' },
      ],
    },
  }
}

function getSubscriptionId(): string {
  const subId = process.env.AZURE_SUBSCRIPTION_ID
  if (!subId) throw new Error('AZURE_SUBSCRIPTION_ID not configured')
  return subId
}

function getMonthDateRange(offset: number): { from: string; to: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + offset
  const first = new Date(year, month, 1)
  const last = offset === 0 ? now : new Date(year, month + 1, 0)
  last.setHours(23, 59, 59, 999)
  return {
    from: first.toISOString().split('T')[0],
    to: last.toISOString().split('T')[0],
  }
}

export async function queryMonthlyCost(timeframe: 'ThisMonth' | 'LastMonth' = 'ThisMonth'): Promise<CostQueryResult> {
  const subscriptionId = getSubscriptionId()
  const token = await getAccessToken()

  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=${COST_API_VERSION}`

  const body = buildCostQuery(timeframe)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown')
    throw new Error(`Cost query failed (${res.status}): ${err}`)
  }

  const data = await res.json()

  const rows: Array<{ cost: number; resourceId: string; resourceType: string; location: string | null; date: string }> = []
  let totalCost = 0
  let currency = 'USD'

  const columns = data.properties?.columns || []
  const rowsData = data.properties?.rows || []

  const costIdx = columns.findIndex((c: { name: string }) => c.name === 'PreTaxCost')
  const resourceIdIdx = columns.findIndex((c: { name: string }) => c.name === 'ResourceId')
  const resourceTypeIdx = columns.findIndex((c: { name: string }) => c.name === 'ResourceType')
  const locationIdx = columns.findIndex((c: { name: string }) => c.name === 'ResourceLocation')

  for (const row of rowsData) {
    const cost = typeof row[costIdx] === 'number' ? row[costIdx] : 0
    totalCost += cost || 0
    rows.push({
      cost: cost || 0,
      resourceId: row[resourceIdIdx] || '',
      resourceType: row[resourceTypeIdx] || '',
      location: row[locationIdx] || null,
      date: '',
    })
  }

  const resourceMap = new Map<string, { cost: number; resourceType: string; location: string | null }>()
  for (const r of rows) {
    const key = r.resourceId
    const existing = resourceMap.get(key)
    if (existing) {
      existing.cost += r.cost
    } else {
      resourceMap.set(key, { cost: r.cost, resourceType: r.resourceType, location: r.location })
    }
  }

  const resources: CostResource[] = Array.from(resourceMap.entries()).map(([resourceId, info]) => {
    const name = resourceId.split('/').pop() || resourceId
    return {
      resourceId,
      resourceName: name,
      resourceType: info.resourceType,
      location: info.location,
      cost: Math.round(info.cost * 100) / 100,
      currency,
      meterCategory: null,
      meterSubCategory: null,
    }
  }).sort((a, b) => b.cost - a.cost)

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    forecast: null,
    currency,
    resources,
    dailyCosts: [],
    periodStart: '',
    periodEnd: '',
  }
}

export async function getForecast(): Promise<number | null> {
  const subscriptionId = getSubscriptionId()
  const token = await getAccessToken()

  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=${COST_API_VERSION}`

  const body = {
    type: 'ActualCost',
    timeframe: 'MonthToDate',
    dataset: {
      granularity: 'Daily',
      aggregation: {
        totalCost: { name: 'PreTaxCost', function: 'Sum' },
      },
    },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) return null

    const data = await res.json()
    const rows = data.properties?.rows || []
    const columns = data.properties?.columns || []
    const costIdx = columns.findIndex((c: { name: string }) => c.name === 'PreTaxCost')

    const daysInMonth = new Date().getDate()
    const daysTotal = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    let soFar = 0
    for (const row of rows) {
      soFar += typeof row[costIdx] === 'number' ? row[costIdx] : 0
    }
    return Math.round((soFar / daysInMonth) * daysTotal * 100) / 100
  } catch {
    return null
  }
}

export async function getAdvisorRecommendations(): Promise<Recommendation[]> {
  const subscriptionId = getSubscriptionId()
  const token = await getAccessToken()

  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Advisor/recommendations?api-version=2023-01-01&$filter=Category eq 'Cost'`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return []

    const data = await res.json()
    return (data.value || []).map((rec: Record<string, unknown>) => {
      const props = rec.properties as Record<string, unknown> || {}
      const extended = props.extendedProperties as Record<string, string> | undefined || {}
      const resId = (props.resourceMetadata as Record<string, string> | undefined)?.resourceId || ''
      const nameFromId = resId ? resId.split('/').pop() || resId : ''
      return {
        resourceId: resId,
        resourceName: extended.resourceName || nameFromId,
        recommendationType: (props.recommendationTypeId as string || '').split('/').pop() || 'general',
        impact: Math.max(0, parseFloat(String(props.impactedValue || '0'))) || 0,
        currency: 'USD',
        description: (props.shortDescription as Record<string, string> | undefined)?.solution || null,
        action: props.remediation as string | null,
      }
    })
  } catch {
    return []
  }
}

export async function syncCostSnapshot(): Promise<{ snapshotId: string; cost: number }> {
  const costData = await queryMonthlyCost('ThisMonth')
  const forecast = await getForecast()

  const subscriptionId = getSubscriptionId()

  const snapshot = await prisma.azureCostSnapshot.create({
    data: {
      subscriptionId,
      date: new Date(),
      cost: costData.totalCost,
      currency: costData.currency,
      forecast,
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    },
  })

  if (costData.resources.length > 0) {
    await prisma.azureCostBreakdown.createMany({
      data: costData.resources.map((r) => ({
        snapshotId: snapshot.id,
        resourceId: r.resourceId,
        resourceName: r.resourceName,
        resourceType: r.resourceType,
        location: r.location,
        cost: r.cost,
        currency: r.currency,
        meterCategory: r.meterCategory,
        meterSubCategory: r.meterSubCategory,
      })),
    })
  }

  const existingRecs = await prisma.azureRecommendation.count()
  if (existingRecs === 0) {
    const recommendations = await getAdvisorRecommendations()
    if (recommendations.length > 0) {
      await prisma.azureRecommendation.createMany({
        data: recommendations.map((r) => ({
          resourceId: r.resourceId,
          resourceName: r.resourceName,
          recommendationType: r.recommendationType,
          impact: r.impact,
          currency: r.currency,
          description: r.description,
          action: r.action,
        })),
      })
    }
  }

  return { snapshotId: snapshot.id, cost: costData.totalCost }
}

export async function getContainerAppCount(): Promise<number> {
  const subscriptionId = getSubscriptionId()
  const token = await getAccessToken()

  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.App/containerApps?api-version=2024-02-02-preview`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return 0
    const data = await res.json()
    return data.value?.length || 0
  } catch {
    return 0
  }
}
