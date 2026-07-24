export async function getAzureAccessToken(): Promise<string> {
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

export interface ContainerAppInfo {
  exists: boolean
  resourceGroup?: string
  acrName?: string
  acrLoginServer?: string
  location?: string
}

const CONTAINER_APPS_API_VERSION = '2024-02-02-preview'

function getContainerAppResourceUrl(subscriptionId: string, resourceGroup: string, containerAppName: string) {
  return `https://management.azure.com/subscriptions/${encodeURIComponent(subscriptionId)}/resourceGroups/${encodeURIComponent(resourceGroup)}/providers/Microsoft.App/containerApps/${encodeURIComponent(containerAppName)}?api-version=${CONTAINER_APPS_API_VERSION}`
}

export async function getContainerAppResource(
  subscriptionId: string,
  resourceGroup: string,
  containerAppName: string,
): Promise<{ status: number; resource?: Record<string, unknown>; error?: string }> {
  const token = await getAzureAccessToken()
  const res = await fetch(getContainerAppResourceUrl(subscriptionId, resourceGroup, containerAppName), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return { status: res.status, error: await res.text() }
  return { status: res.status, resource: await res.json() }
}

export async function updateContainerAppResource(
  subscriptionId: string,
  resourceGroup: string,
  containerAppName: string,
  resource: Record<string, unknown>,
): Promise<{ status: number; resource?: Record<string, unknown>; error?: string }> {
  const token = await getAzureAccessToken()
  const res = await fetch(getContainerAppResourceUrl(subscriptionId, resourceGroup, containerAppName), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resource),
  })

  if (!res.ok) return { status: res.status, error: await res.text() }
  return { status: res.status, resource: await res.json() }
}

export async function getContainerAppInfo(
  containerAppName: string,
  subscriptionId: string
): Promise<ContainerAppInfo> {
  const token = await getAzureAccessToken()

  let url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.App/containerApps?api-version=2024-02-02-preview`
  let app: any = null

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return { exists: false }

    const data = await res.json()
    app = data.value?.find(
      (ca: { name: string }) => ca.name === containerAppName
    ) ?? null
    if (app) break

    url = data.nextLink || ''
  }

  if (!app) return { exists: false }

  const rgMatch = app.id.match(/\/resourceGroups\/([^/]+)/i)
  const resourceGroup = rgMatch?.[1]
  const location = app.location

  const registries = app.properties?.configuration?.registries
  const acrLoginServer: string | undefined = registries?.[0]?.server
  const acrName: string | undefined = acrLoginServer?.split('.')[0]

  return { exists: true, resourceGroup, acrName, acrLoginServer, location }
}

export async function getGraphAccessToken(): Promise<string> {
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET
  const tenantId = process.env.AZURE_TENANT_ID
  if (!clientId || !clientSecret || !tenantId) throw new Error('Azure credentials not configured')

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph auth failed: ${err}`)
  }
  const data = await res.json()
  return data.access_token
}

export interface CredentialCheckResult {
  ok: boolean
  message: string
}

async function getGraphApp(): Promise<{ id: string; appId: string; displayName: string } | null> {
  const clientId = process.env.AZURE_CLIENT_ID
  if (!clientId) return null
  const token = await getGraphAccessToken()
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/applications?$filter=appId eq '${clientId}'`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown')
    throw new Error(`Graph API error (${res.status}): ${err}`)
  }
  const data = await res.json()
  const app = data.value?.[0]
  if (!app?.id) throw new Error(`No app registration found for clientId ${clientId} in Azure AD`)
  return { id: app.id, appId: app.appId, displayName: app.displayName }
}

export async function checkFederatedCredentialReadiness(
  repoOrg: string, repoName: string, branch: string
): Promise<CredentialCheckResult> {
  try {
    const clientId = process.env.AZURE_CLIENT_ID
    if (!clientId) return { ok: false, message: 'AZURE_CLIENT_ID environment variable not set' }

    const app = await getGraphApp()
    if (!app) return { ok: false, message: 'Azure AD application registration not found for this client ID' }
    const subject = `repo:${repoOrg}/${repoName}:ref:refs/heads/${branch}`

    const existingRes = await fetch(
      `https://graph.microsoft.com/v1.0/applications/${app.id}/federatedIdentityCredentials`,
      { headers: { Authorization: `Bearer ${await getGraphAccessToken()}` } }
    )
    if (!existingRes.ok) {
      const err = await existingRes.text().catch(() => 'unknown')
      return { ok: false, message: `Cannot list federated credentials. App "${app.displayName}" needs Application.ReadWrite.All permission. (${existingRes.status}: ${err})` }
    }
    const existingData = await existingRes.json()
    const alreadyExists = existingData.value?.some((fc: { subject: string }) => fc.subject === subject)
    if (alreadyExists) return { ok: true, message: `Federated credential already exists for ${repoOrg}/${repoName}:${branch}` }

    return { ok: true, message: `Ready to create federated credential for ${repoOrg}/${repoName}:${branch}` }
  } catch (e) {
    return { ok: false, message: `OIDC check failed: ${(e as Error).message}` }
  }
}

export async function createFederatedCredential(
  repoOrg: string,
  repoName: string,
  branch: string,
): Promise<CredentialCheckResult> {
  try {
    const clientId = process.env.AZURE_CLIENT_ID
    if (!clientId) throw new Error('AZURE_CLIENT_ID not configured')

    const app = await getGraphApp()
    if (!app) return { ok: false, message: 'Azure AD application registration not found' }

    const credentialName = `${repoOrg}-${repoName}-${branch}`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 120)
    const subject = `repo:${repoOrg}/${repoName}:ref:refs/heads/${branch}`

    const existingRes = await fetch(
      `https://graph.microsoft.com/v1.0/applications/${app.id}/federatedIdentityCredentials`,
      { headers: { Authorization: `Bearer ${await getGraphAccessToken()}` } }
    )
    if (existingRes.ok) {
      const existingData = await existingRes.json()
      if (existingData.value?.some((fc: { subject: string }) => fc.subject === subject)) {
        return { ok: true, message: 'Already exists' }
      }
    }

    const createRes = await fetch(
      `https://graph.microsoft.com/v1.0/applications/${app.id}/federatedIdentityCredentials`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await getGraphAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: credentialName,
          issuer: 'https://token.actions.githubusercontent.com',
          subject,
          description: `Deploy ${repoName} from GitHub Actions (${branch})`,
          audiences: ['api://AzureADTokenExchange'],
        }),
      }
    )
    if (!createRes.ok) {
      const err = await createRes.text().catch(() => 'unknown')
      return { ok: false, message: `Failed to create federated credential: ${createRes.status} ${err}` }
    }
    return { ok: true, message: `Federated credential created for ${repoOrg}/${repoName}:${branch}` }
  } catch (e) {
    return { ok: false, message: `OIDC error: ${(e as Error).message}` }
  }
}
