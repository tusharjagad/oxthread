# Pipeline Generator Changelog

All notable changes to the CI/CD Pipeline Generator are documented here.

## v2.1.0 (Current)

### Changed
- **Secret created before push** — `AZURE_CREDENTIALS` is now created and stored in GitHub Actions secrets before `pushFiles()` runs, eliminating race condition where the workflow triggered before the secret was available

### Added
- **`getRepoSecret()`** in `src/lib/github/client.ts` — checks if a repo secret exists before attempting creation
- **Existence validation** — both `AZURE_CREDENTIALS` secret and OIDC federated credential are now checked for existence before creation, allowing safe re-runs of pipeline generation

## v2.0.0

### Changed
- **Complete redesign** — pipeline generator no longer scaffolds full project files. Only pushes `.github/workflows/deploy.yml` (+ optional `Dockerfile` if repo has none). User's existing code is never modified.
- **Workflow simplified** — single `build-and-deploy` job: OIDC Azure login, inline `az` commands to create RG/ACR/ACA, `az acr build` to push image, `az containerapp up` to deploy. No Bicep files, no infra scripts.
- **Frontend repo dropdown** — fetches repos from GitHub API, auto-detects framework by scanning `package.json`/`requirements.txt`/`Dockerfile`. Branch dropdown per repo.

### Added
- `GET /api/github/repos` — list user's accessible repos
- `GET /api/github/repos/[owner]/[repo]/branches` — list repo branches
- `GET /api/github/repos/[owner]/[repo]/detect` — detect framework, check Dockerfile existence
- `listUserRepos()`, `listBranches()`, `getRepoFileContent()`, `detectRepoFramework()` in `src/lib/github/client.ts`

### Removed
- All scaffold generators: `generateBicepMain`, `generateBicepParams`, `generateInfraWorkflow`, `generateAcaScript`, `generateEnvTemplate`, README generation
- `autoDeploy` and `repoUrl` from pipeline validation schema
- File viewer with download/copy in frontend (no longer needed — only 1-2 files)

## v1.3.0

### Added
- Error codes (`code` field) in all generate API responses via `errorResponse()` from `src/lib/errors.ts`
- Pipeline generator catch block now uses `errorResponse()` — never leaks internal messages

### Changed
- Generator route imports and uses error codes from `@/lib/errors`

## v1.2.0

### Added
- Azure Bicep infrastructure scaffolding:
  - `infra/main.bicep` — resource group, ACR (admin disabled, managed identity pull), Log Analytics, Container Apps Environment, Container App with System Assigned Identity
  - `infra/parameters.json` — deployment parameters file
  - `.github/workflows/infra.yml` — manual workflow to provision Azure resources via Bicep with OIDC auth
- Updated README with infra section and two-workflow table

### Changed
- `.github/workflows/deploy.yml` — switched from `azure/login@v2` with `creds` (service principal) to OIDC (`client-id`/`tenant-id`/`subscription-id`), now deploys via Bicep with image parameter instead of `container-apps-deploy-action`
- `deploy-aca.sh` — now idempotently deploys Bicep before app deployment

### Security
- OIDC federated credentials replace long-lived service principal secrets
- ACR admin user disabled; image pull via managed identity
- Container App uses System Assigned Identity for ACR auth

## v1.1.0

### Added
- GitHub API integration via `src/lib/github/client.ts`:
  - `pushFiles` — creates/updates files in repo via git tree + commit
  - `registerWebhook` — registers `workflow_run` webhook for deployment status
  - `removeWebhook` — cleanup helper
- `POST /api/pipelines/generate` — Zod validation, pushes scaffold to GitHub, registers webhook, persists pipeline to DB, writes audit log
- `POST /api/webhooks/github` — HMAC-SHA256 verification, updates pipeline status to `DEPLOYED`/`FAILED`
- Frontend fields: GitHub org, repo, branch; deployment status bar with commit SHA, webhook status, repo link
- Prisma Pipeline model — `githubOrg`, `githubRepo`, `githubBranch`, `webhookId`, `webhookSecret`, `lastDeployedAt`, `deploymentUrl`

### Changed
- Pipeline status flow: `GENERATED` → `PUSHED` (after git push) → `DEPLOYED`/`FAILED` (after webhook callback)
- `POST /api/pipelines/generate` now requires authentication with RBAC

## v1.0.0

### Added
- Initial pipeline generator with scaffold files:
  - `Dockerfile` — multi-stage build (supports Next.js, React, Node.js, Python, FastAPI)
  - `.github/workflows/deploy.yml` — test, build & push to GHCR, deploy to Azure Container Apps
  - `deploy-aca.sh` — Azure CLI deployment script
  - `.env.template` — environment variable template
  - `README.md` — deployment documentation
- Dashboard page with create-pipeline form (framework, Dockerfile path, Azure region, Container App name)
- Prisma Pipeline model — `appName`, `repoUrl`, `framework`, `dockerfilePath`, `azureRegion`, `containerApp`, `status`, `createdBy`
- Dashboard route to list/display pipelines
