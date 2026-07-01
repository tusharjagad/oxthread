import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import { getContainerAppInfo, checkFederatedCredentialReadiness } from '@/lib/azure'
import { getRepoFileContent } from '@/lib/github/client'
import { errorResponse } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const githubOrg = searchParams.get('githubOrg')
    const githubRepo = searchParams.get('githubRepo')
    const githubBranch = searchParams.get('githubBranch') || 'main'
    const containerApp = searchParams.get('containerApp')
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID

    const results: Record<string, { ok: boolean; message: string; blocking?: boolean }> = {}

    // 1. Check Azure subscription config
    if (!subscriptionId) {
      results.azureConfig = { ok: false, message: 'AZURE_SUBSCRIPTION_ID not configured' }
    } else if (!containerApp) {
      results.azureConfig = { ok: false, message: 'No container app specified' }
    } else {
      const caInfo = await getContainerAppInfo(containerApp, subscriptionId)
      results.azureContainerApp = {
        ok: caInfo.exists,
        message: caInfo.exists
          ? `Container App "${containerApp}" found in "${caInfo.resourceGroup || '?'}"`
          : `Container App "${containerApp}" not found in Azure subscription`,
      }
      if (caInfo.exists) {
        results.azureResourceGroup = { ok: true, message: caInfo.resourceGroup || 'auto-detected' }
        results.azureRegistry = { ok: !!(caInfo.acrLoginServer), message: caInfo.acrLoginServer || 'No ACR attached to container app' }
      }
    }

    // 2. Check Azure OIDC federated credential readiness
    if (githubOrg && githubRepo) {
      const oidcResult = await checkFederatedCredentialReadiness(githubOrg, githubRepo, githubBranch)
      results.azureOidc = { ok: oidcResult.ok, message: oidcResult.message }

      // 3. Check GitHub repo access and secrets API
      try {
        const pubKeyRes = await fetch(`https://api.github.com/repos/${githubOrg}/${githubRepo}/actions/secrets/public-key`, {
          headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN || ''}`, 'User-Agent': 'OxThread', Accept: 'application/vnd.github.v3+json' },
        })
        let pubKeyBody = ''
        try { pubKeyBody = await pubKeyRes.text() } catch {}
        const pubKeyOk = pubKeyRes.ok
        results.githubSecrets = {
          ok: pubKeyOk,
          message: pubKeyOk
            ? 'GitHub Actions secrets API accessible (token has repo scope)'
            : `GitHub secrets API error (${pubKeyRes.status}). ${pubKeyBody.slice(0, 200)}`,
        }
      } catch (e) {
        results.githubSecrets = { ok: false, message: `Secret check error: ${(e as Error).message}` }
      }

      // 4. Check webhook registration capability (non-blocking — works on deploy only)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
      if (!baseUrl || baseUrl.includes('localhost')) {
        results.githubWebhook = {
          ok: false, blocking: false,
          message: baseUrl
            ? `Webhook URL (${baseUrl}) is localhost. Set NEXT_PUBLIC_BASE_URL to a public URL for webhook registration.`
            : 'NEXT_PUBLIC_BASE_URL not set. Webhook registration requires a public URL.',
        }
      } else {
        results.githubWebhook = { ok: true, message: `Webhook URL configured: ${baseUrl}` }
      }

      // 5. Check existing Dockerfile
      try {
        const existingDf = await getRepoFileContent(githubOrg, githubRepo, 'Dockerfile', githubBranch)
        results.dockerfile = { ok: true, message: existingDf ? 'Dockerfile already exists' : 'No Dockerfile found, will generate one' }
      } catch {
        results.dockerfile = { ok: false, message: 'Cannot access repo files. Check GITHUB_TOKEN has repo scope.' }
      }
    }

    // 6. Check environment variables
    const envChecks = [
      { key: 'GITHUB_TOKEN', label: 'GitHub Token' },
      { key: 'AZURE_CLIENT_ID', label: 'Azure Client ID' },
      { key: 'AZURE_CLIENT_SECRET', label: 'Azure Client Secret' },
      { key: 'AZURE_TENANT_ID', label: 'Azure Tenant ID' },
      { key: 'AZURE_SUBSCRIPTION_ID', label: 'Azure Subscription ID' },
    ]
    for (const env of envChecks) {
      const ok = !!process.env[env.key]
      results[`env_${env.key}`] = { ok, message: ok ? `${env.label} configured` : `${env.label} missing` }
    }

    const allOk = Object.values(results).every(r => r.blocking === false || r.ok)
    return NextResponse.json({ ok: allOk, checks: results })
  } catch (error: unknown) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}
