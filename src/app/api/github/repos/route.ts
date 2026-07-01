import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { listUserRepos } from '@/lib/github/client'

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if (!auth.ok) return auth.response

  try {
    const repos = await listUserRepos()
    return NextResponse.json(repos)
  } catch (error) {
    console.error('Failed to list repos:', error)
    return NextResponse.json({ error: 'Failed to list repos' }, { status: 500 })
  }
}
