import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-hub-signature-256') || ''
  const event = request.headers.get('x-github-event') || ''
  const delivery = request.headers.get('x-github-delivery') || ''

  try {
    const pipelines = await prisma.pipeline.findMany({
      where: { webhookSecret: { not: null } },
      select: { id: true, webhookSecret: true, appName: true },
    })

    let matchedPipeline: { id: string; appName: string } | null = null
    for (const p of pipelines) {
      const sig = crypto
        .createHmac('sha256', p.webhookSecret!)
        .update(body)
        .digest('hex')
      if (`sha256=${sig}` === signature) {
        matchedPipeline = p
        break
      }
    }

    if (!matchedPipeline) {
      return NextResponse.json({ error: 'No matching pipeline' }, { status: 202 })
    }

    if (event === 'workflow_run') {
      const payload = JSON.parse(body)
      const workflowRun = payload.workflow_run
      const conclusion = workflowRun?.conclusion
      const status = workflowRun?.status
      const htmlUrl = workflowRun?.html_url

      if (status === 'completed') {
        const pipelineStatus = conclusion === 'success' ? 'DEPLOYED' : 'FAILED'
        const updateData: Record<string, unknown> = { status: pipelineStatus }
        if (conclusion === 'success') {
          updateData.lastDeployedAt = new Date()
          const repoFullName = payload.repository?.full_name
          const containerApp = (await prisma.pipeline.findUnique({
            where: { id: matchedPipeline.id },
            select: { containerApp: true },
          }))?.containerApp
          if (containerApp && repoFullName) {
            updateData.deploymentUrl = `https://${containerApp}.${payload.repository?.owner?.login || 'azurecontainerapps.io'}`
          }
        }
        await prisma.pipeline.update({
          where: { id: matchedPipeline.id },
          data: updateData,
        })
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
