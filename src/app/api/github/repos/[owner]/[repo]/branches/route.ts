import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { listBranches } from '@/lib/github/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const auth = requireAuth(request)
  if (!auth.ok) return auth.response

  try {
    const { owner, repo } = await params
    const branches = await listBranches(owner, repo)
    return NextResponse.json(branches)
  } catch (error) {
    console.error('Failed to list branches:', error)
    return NextResponse.json({ error: 'Failed to list branches' }, { status: 500 })
  }
}
