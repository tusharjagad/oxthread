import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { detectRepoFramework, getRepoDefaultBranch } from '@/lib/github/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const auth = requireAuth(request)
  if (!auth.ok) return auth.response

  try {
    const { owner, repo } = await params
    const branch = request.nextUrl.searchParams.get('branch') || await getRepoDefaultBranch(owner, repo)
    const detection = await detectRepoFramework(owner, repo, branch)
    return NextResponse.json({ ...detection, branch })
  } catch (error) {
    console.error('Failed to detect framework:', error)
    return NextResponse.json({ error: 'Failed to detect framework' }, { status: 500 })
  }
}
