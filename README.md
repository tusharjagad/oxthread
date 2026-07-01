# OxThread

Dashboard application for managing **CI/CD pipelines** (Azure Container Apps) and **PostgreSQL databases** — with role-based access control and audit logging.

## Features

- **CI/CD Pipeline Generator** — Creates GitHub Actions workflows with OIDC authentication. Select a repo + branch, pick your framework, and OxThread pushes a deploy workflow + Dockerfile, creates GitHub secrets, registers a webhook, and provisions an Azure federated credential.
- **PostgreSQL Manager** — Register servers, discover databases, create users with role-based access, rotate passwords, test live connectivity, and manage access requests with auto-provisioning.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local   # fill in your values (see below)

# 3. Create the database (Prisma does NOT do this automatically)
createdb oxthread
# Or: psql -c "CREATE DATABASE oxthread;"

# 4. Sync schema + seed admin user
npx prisma generate && npx prisma db push && npx prisma db seed

# 5. Start development server
npm run dev
```

Open http://localhost:3000 and log in with the seed admin credentials (default: `admin` / `Admin@12345!`).

## Prerequisites

| What | Purpose | How to Get |
|---|---|---|
| **PostgreSQL** >= 15 | OxThread's own database | `brew install postgresql` or cloud provider |
| **GitHub fine-grained PAT** | Push files, create secrets, register webhooks | GitHub → Settings → Developer settings → Fine-grained tokens — `Contents: write`, `Secrets: write`, `Webhooks: write`, `Metadata: read` |
| **Azure service principal** | Read container apps, create OIDC credentials | `az ad sp create-for-rbac --role Contributor` (details in `docs/setup-guide.md`) |
| **Azure AD API permission** | Create federated credentials via Graph API | `Application.ReadWrite.All` + Grant admin consent |

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://postgres:password@localhost:5432/oxthread`) |
| `GITHUB_TOKEN` | Fine-grained PAT with `Contents: write`, `Secrets: write`, `Webhooks: write` |
| `AZURE_CLIENT_ID` | Azure App Registration client ID |
| `AZURE_CLIENT_SECRET` | Azure client secret |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `JWT_SECRET` | Run `openssl rand -hex 32` |
| `NEXTAUTH_SECRET` | Run `openssl rand -hex 32` |

### Optional

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | — | Public URL for webhooks (required in production; on localhost webhooks are skipped) |
| `SESSION_EXPIRY_MINUTES` | `30` | Session idle timeout |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Frontend URL |
| `SCHEDULER_API_KEY` | — | For cron endpoint. Run `openssl rand -hex 32` |
| `SEED_ADMIN_USERNAME` | `admin` | Initial admin username |
| `SEED_ADMIN_PASSWORD` | `Admin@12345!` | Initial admin password |

## Using the Pipeline Generator

1. Go to **Pipelines** in the dashboard
2. **Step 1**: Enter your Azure Container App name → **Verify**
3. **Step 2**: Select GitHub repo + branch → **Verify OIDC & GitHub Setup**
4. **Step 3**: Enter app name, framework, region → **Create Pipeline**

The generator pushes `.github/workflows/deploy.yml` (and a `Dockerfile` if missing) to your repo, then runs: OIDC Azure login → create RG/ACR → `az acr build` → `az containerapp up`.

## Using the PostgreSQL Manager

1. Go to **PostgreSQL** in the dashboard
2. **Servers** → Register a server with its connection string env var reference
3. **Databases** → Discover databases on the server
4. **Users** → Create users with access profiles (read-only/read-write/admin)
5. **Access Requests** → Self-service request → Admin approves → User auto-provisioned

## Documentation

| Doc | Contents |
|---|---|
| `docs/overview.md` | Architecture, data flow, API route map, feature deep-dive |
| `docs/setup-guide.md` | Step-by-step: Azure SP, GitHub PAT, OIDC, verification, troubleshooting |
| `docs/error-codes.md` | API error code reference |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npx prisma studio` | Database UI |
| `npx prisma db push` | Sync schema to database |
| `npx prisma db seed` | Seed admin user |

## Docker Deployment

```bash
# Build and start both app + PostgreSQL
docker compose up --build -d

# Run schema sync (first time only)
docker compose exec app npx prisma db push
docker compose exec app npx prisma db seed

# App runs at http://localhost:3000
```

The compose file starts a production Next.js server + PostgreSQL 15 container with persistent volume. Set env vars in `docker-compose.yml` or pass them via a `.env` file mounted at runtime.
