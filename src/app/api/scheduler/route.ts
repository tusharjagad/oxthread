import { NextRequest, NextResponse } from 'next/server'
import { processExpiredUsers, processExpiredAccessRequests } from '@/lib/postgres/scheduler'
import { syncCostSnapshot } from '@/lib/azure-cost'
import { syncAiAlerts } from '@/lib/ai-monitor'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.SCHEDULER_API_KEY

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [userResult, requestResult, costResult, alertResult] = await Promise.all([
      processExpiredUsers(),
      processExpiredAccessRequests(),
      syncCostSnapshot().catch(() => null),
      syncAiAlerts().catch(() => ({ created: 0 })),
    ])

    return NextResponse.json({
      ok: true,
      usersExpired: userResult.expired,
      userErrors: userResult.errors,
      accessRequestsExpired: requestResult,
      costSynced: costResult?.cost ?? null,
      costSnapshotId: costResult?.snapshotId ?? null,
      alertsCreated: alertResult.created,
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
