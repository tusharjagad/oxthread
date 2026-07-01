import { NextResponse } from 'next/server'

export async function GET() {
  const github = process.env.GITHUB_TOKEN
    ? { status: 'connected', details: 'Token configured' }
    : { status: 'not-configured', details: 'GITHUB_TOKEN not set' }

  const azure = (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET)
    ? { status: 'connected', details: 'Azure configured' }
    : { status: 'not-configured', details: 'AZURE_CLIENT_ID/AZURE_CLIENT_SECRET not set' }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const webhook = baseUrl
    ? { status: 'connected', details: `${baseUrl}/api/webhooks/github` }
    : { status: 'not-configured', details: 'NEXT_PUBLIC_BASE_URL not set' }

  return NextResponse.json({ github, azure, webhook })
}
