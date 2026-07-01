import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'
import { generatePipelineSchema } from '@/lib/validations/pipeline'
import { pushFiles, registerWebhook, getRepoFileContent, createOrUpdateRepoSecret, getRepoSecret } from '@/lib/github/client'
import { getContainerAppInfo, createFederatedCredential, checkFederatedCredentialReadiness, type CredentialCheckResult } from '@/lib/azure'
import crypto from 'crypto'
import { errorResponse } from '@/lib/errors'

const PORT_MAP: Record<string, number> = {
  nextjs: 3000, react: 80, nodejs: 3000, python: 8000, fastapi: 8000,
}

function generateDockerfile(framework: string): string {
  const configs: Record<string, string> = {
    nextjs: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
ENV PORT 3000
CMD ["npm", "run", "start"]`,

    react: `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,

    nodejs: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]`,

    python: `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`,

    fastapi: `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]`,
  }
  return configs[framework] || configs.nodejs
}

function generateWorkflow(config: {
  appName: string; containerApp: string; resourceGroup: string; acrName: string; azureRegion: string
  githubBranch: string; framework: string; dockerfilePath: string
}): string {
  const port = PORT_MAP[config.framework] || 3000
  return `name: Deploy ${config.appName} to Azure

on:
  push:
    branches: [${config.githubBranch}]

permissions:
  id-token: write
  contents: read

env:
  APP_NAME: ${config.containerApp}
  RG_NAME: ${config.resourceGroup}
  ACR_NAME: ${config.acrName}
  REGION: ${config.azureRegion}
  IMAGE_TAG: \${{ github.sha }}
  PORT: ${port}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: \${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and Push to ACR
        run: |
          az acr build --registry "\$ACR_NAME" --resource-group "\$RG_NAME" --image "\$APP_NAME:\$IMAGE_TAG" --file "${config.dockerfilePath}" . --only-show-errors

      - name: Get ACR Login Server
        run: |
          echo "ACR_LOGIN_SERVER=\$(az acr show --name \$ACR_NAME --resource-group "\$RG_NAME" --query loginServer -o tsv)" >> \$GITHUB_ENV

      - name: Update Container App
        run: |
          az containerapp update \\
            --name "\$APP_NAME" \\
            --resource-group "\$RG_NAME" \\
            --image "\$ACR_LOGIN_SERVER/\$APP_NAME:\$IMAGE_TAG" \\
            --only-show-errors`
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const parsed = generatePipelineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const config = parsed.data
    const containerApp = config.containerApp || config.appName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const repoUrl = `https://github.com/${config.githubOrg}/${config.githubRepo}`
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Azure subscription not configured' }, { status: 500 })
    }

    const caInfo = await getContainerAppInfo(containerApp, subscriptionId)
    if (!caInfo.exists) {
      return NextResponse.json({
        error: `Container app '${containerApp}' not found in Azure subscription. Create it first and ensure the service principal has access.`,
        code: 'CONTAINER_APP_NOT_FOUND',
      }, { status: 404 })
    }

    const existingDockerfile = await getRepoFileContent(
      config.githubOrg, config.githubRepo, 'Dockerfile', config.githubBranch
    )
    const hasDockerfile = !!existingDockerfile

    const files: Record<string, string> = {}
    if (!hasDockerfile) {
      files['Dockerfile'] = generateDockerfile(config.framework)
    }
    files['.github/workflows/deploy.yml'] = generateWorkflow({
      appName: config.appName,
      containerApp,
      resourceGroup: caInfo.resourceGroup || `rg-${containerApp}`,
      acrName: caInfo.acrName || `acr${containerApp.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      azureRegion: caInfo.location || config.azureRegion || 'eastus',
      githubBranch: config.githubBranch,
      framework: config.framework,
      dockerfilePath: './Dockerfile',
    })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const webhookSecret = crypto.randomBytes(24).toString('hex')

    await createAuditLog({
      userId: auth.userId,
      action: 'PIPELINE_GENERATE_START',
      resource: 'pipelines',
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { appName: config.appName, repo: `${config.githubOrg}/${config.githubRepo}`, branch: config.githubBranch, framework: config.framework },
    })

    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET
    const tenantId = process.env.AZURE_TENANT_ID
    const subId = process.env.AZURE_SUBSCRIPTION_ID

    // Create pipeline record first so we have an ID for audit logs
    const pipeline = await prisma.pipeline.create({
      data: {
        appName: config.appName,
        repoUrl,
        framework: config.framework,
        dockerfilePath: './Dockerfile',
        azureRegion: config.azureRegion || 'eastus',
        containerApp,
        status: 'GENERATED',
        createdBy: auth.userId,
        githubOrg: config.githubOrg,
        githubRepo: config.githubRepo,
        githubBranch: config.githubBranch,
        version: 1,
      },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'PIPELINE_GENERATE_START',
      resource: 'pipelines',
      resourceId: pipeline.id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { appName: config.appName, repo: `${config.githubOrg}/${config.githubRepo}`, branch: config.githubBranch, framework: config.framework },
    })

    // Create the AZURE_CREDENTIALS secret BEFORE pushing files, so it exists when the workflow is triggered
    let secretsSetup = true
    if (clientId && clientSecret && tenantId && subId) {
      const secretExists = await getRepoSecret(config.githubOrg, config.githubRepo, 'AZURE_CREDENTIALS')
      if (secretExists) {
        secretsSetup = true
      } else {
        const credentialJson = JSON.stringify({ clientId, clientSecret, subscriptionId: subId, tenantId })
        secretsSetup = await createOrUpdateRepoSecret(config.githubOrg, config.githubRepo, 'AZURE_CREDENTIALS', credentialJson)
      }
    }

    const githubFiles = Object.entries(files).map(([path, content]) => ({ path, content }))
    const pushResult = await pushFiles(
      config.githubOrg,
      config.githubRepo,
      config.githubBranch,
      githubFiles,
      `ci: add deployment pipeline for ${config.appName}`
    )

    let webhookResult: { success: boolean; webhookId?: number; error?: string } = { success: false, error: 'Skipped' }
    if (pushResult.success) {
      webhookResult = await registerWebhook(
        config.githubOrg,
        config.githubRepo,
        `${baseUrl}/api/webhooks/github`,
        webhookSecret
      )
    }

    let federatedCredentialSetup = false
    const auditLogEntries: Record<string, { action: string; status: string; details: string }> = {}

    if (pushResult.success) {
      auditLogEntries['push'] = { action: 'GITHUB_PUSH', status: 'SUCCESS', details: `Committed ${Object.keys(files).length} files (${pushResult.commitSha?.slice(0, 7)})` }
      await createAuditLog({
        userId: auth.userId, action: 'GITHUB_PUSH', resource: 'pipelines',
        resourceId: pipeline.id,
        ipAddress: getIpFromRequest(request), status: 'SUCCESS',
        metadata: { repo: `${config.githubOrg}/${config.githubRepo}`, commitSha: pushResult.commitSha, files: Object.keys(files), branch: config.githubBranch },
      })

      const readiness = await checkFederatedCredentialReadiness(
        config.githubOrg, config.githubRepo, config.githubBranch
      )
      let fedResult: CredentialCheckResult
      if (readiness.ok && readiness.message.includes('already exists')) {
        fedResult = readiness
      } else {
        fedResult = await createFederatedCredential(
          config.githubOrg, config.githubRepo, config.githubBranch
        )
      }
      federatedCredentialSetup = fedResult.ok
      auditLogEntries['federatedCredential'] = {
        action: 'AZURE_FEDERATED_CREDENTIAL',
        status: fedResult.ok ? 'SUCCESS' : 'FAILURE',
        details: fedResult.message,
      }
      await createAuditLog({
        userId: auth.userId, action: 'AZURE_FEDERATED_CREDENTIAL', resource: 'pipelines',
        resourceId: pipeline.id,
        ipAddress: getIpFromRequest(request), status: fedResult.ok ? 'SUCCESS' : 'FAILURE',
        metadata: { org: config.githubOrg, repo: config.githubRepo, branch: config.githubBranch, message: fedResult.message },
      })

      auditLogEntries['secrets'] = {
        action: 'GITHUB_SECRETS',
        status: secretsSetup ? 'SUCCESS' : 'FAILURE',
        details: secretsSetup ? 'AZURE_CREDENTIALS secret created' : 'Failed to create secret',
      }
      await createAuditLog({
        userId: auth.userId, action: 'GITHUB_SECRETS', resource: 'pipelines',
        resourceId: pipeline.id,
        ipAddress: getIpFromRequest(request), status: secretsSetup ? 'SUCCESS' : 'FAILURE',
        metadata: { secretName: 'AZURE_CREDENTIALS', org: config.githubOrg, repo: config.githubRepo },
      })
    }

    if (webhookResult.success) {
      auditLogEntries['webhook'] = {
        action: 'GITHUB_WEBHOOK',
        status: 'SUCCESS',
        details: `Webhook #${webhookResult.webhookId} registered`,
      }
      await createAuditLog({
        userId: auth.userId, action: 'GITHUB_WEBHOOK', resource: 'pipelines',
        resourceId: pipeline.id,
        ipAddress: getIpFromRequest(request), status: 'SUCCESS',
        metadata: { webhookId: webhookResult.webhookId, org: config.githubOrg, repo: config.githubRepo },
      })
    }

    // Update pipeline with results
    await prisma.pipeline.update({
      where: { id: pipeline.id },
      data: {
        status: pushResult.success ? 'PUSHED' : 'GENERATED',
        webhookId: webhookResult.success ? webhookResult.webhookId! : null,
        webhookSecret: webhookResult.success ? webhookSecret : null,
        auditLog: Object.values(auditLogEntries),
      },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'PIPELINE_GENERATED',
      resource: 'pipelines',
      resourceId: pipeline.id,
      ipAddress: getIpFromRequest(request),
      status: pushResult.success ? 'SUCCESS' : 'FAILURE',
      metadata: {
        appName: config.appName,
        framework: config.framework,
        pushed: pushResult.success,
        commitSha: pushResult.commitSha,
        webhookRegistered: webhookResult.success,
        federatedCredential: federatedCredentialSetup,
        secretsConfigured: secretsSetup,
        repo: `${config.githubOrg}/${config.githubRepo}`,
        filesGenerated: Object.keys(files),
        dockerfileGenerated: !hasDockerfile,
        containerApp: caInfo.exists,
        version: 1,
      },
    })

    return NextResponse.json({
      pipeline: { id: pipeline.id, appName: pipeline.appName, status: pushResult.success ? 'PUSHED' : 'GENERATED', commitSha: pushResult.commitSha, version: 1 },
      summary: { filesGenerated: Object.keys(files).length, dockerfileGenerated: !hasDockerfile },
      push: { success: pushResult.success, commitSha: pushResult.commitSha, error: pushResult.error },
      webhook: { success: webhookResult.success, error: webhookResult.error },
      federatedCredential: { success: federatedCredentialSetup },
      secretsSetup: { success: secretsSetup },
      auditLog: Object.values(auditLogEntries),
      repoUrl,
      branch: config.githubBranch,
    }, { status: 201 })
  } catch (error: unknown) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}
