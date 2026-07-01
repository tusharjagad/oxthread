# Setup Guide — Prerequisites & Configuration

## 1. Local Environment

### Required Software

- **Node.js** >= 18
- **PostgreSQL** >= 15 — install via `brew install postgresql@15` (macOS) or your package manager
- **npm** (comes with Node.js)

### Start PostgreSQL

```bash
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Verify
psql postgres -c "SELECT version();"
```

### Create the Database

```bash
psql postgres -c "CREATE DATABASE oxthread;"
```

---

## 2. GitHub Repository

1. Create a repo at https://github.com/new under your org or personal account
2. Name it (e.g. `my-app`), set **Private**
3. Leave it **empty** (no README, no .gitignore, no license)
4. Repo must exist **before** running the pipeline generator

---

## 3. GitHub Fine-Grained Token

**Use fine-grained tokens** (not classic PATs). They are scoped to specific repos and have narrower permissions.

1. Go to **GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Click **Generate new token**
3. Set:
   - **Token name**: `oxthread-pipeline`
   - **Expiration**: 90 days (or No expiration for dev)
   - **Repository access**: Only select repositories → choose your target repo
4. **Repository permissions** (set each to **Read and write**):

   | Permission | Reason |
   |---|---|
   | Contents | Push Dockerfile + workflow files |
   | Secrets | Create `AZURE_CREDENTIALS` secret |
   | Webhooks | Register deploy status webhook |
   | Metadata | Read (auto-granted) |

5. Click **Generate token** and copy the token value

**Troubleshooting:**
- If the repo doesn't appear in the selection list — create the repo first, then edit token settings to add it
- The token owner must be a **collaborator** (Write access) or **org member** of the target org
- To create a collaborator: GitHub → Repo → Settings → Collaborators → Add people

---

## 4. Azure Service Principal

Create a service principal with Contributor role on your subscription.

```bash
# Login
az login

# Set subscription (use your subscription ID)
az account set --subscription "ec9e7040-8266-4b02-ae26-32a8fbfcdd2c"

# Create service principal
az ad sp create-for-rbac --name "oxthread-pipeline-sp" \
  --role Contributor \
  --scopes /subscriptions/ec9e7040-8266-4b02-ae26-32a8fbfcdd2c
```

Save the output values:

| Output field | Env var |
|---|---|
| `appId` | `AZURE_CLIENT_ID` |
| `tenant` | `AZURE_TENANT_ID` |
| `password` | `AZURE_CLIENT_SECRET` |
| (your subscription ID) | `AZURE_SUBSCRIPTION_ID` |

### Grant App Registration API Permission

The service principal needs `Application.ReadWrite.All` to create OIDC federated credentials via Microsoft Graph.

1. Go to **Azure Portal → Microsoft Entra ID → App registrations → oxthread-pipeline-sp**
2. **API permissions → Add a permission → Microsoft Graph → Application permissions**
3. Search for `Application.ReadWrite.All`, check it, click **Add permissions**
4. Click **Grant admin consent** (requires Global Admin)

---

## 5. OIDC Federated Credential

This allows GitHub Actions to authenticate to Azure without storing secrets in GitHub.

The pipeline generator creates this automatically (Step 3). To create manually:

1. **Azure Portal → Microsoft Entra ID → App registrations → oxthread-pipeline-sp**
2. **Certificates & secrets → Federated credentials → Add credential**
3. Scenario: **GitHub Actions deploying Azure resources**
4. Fill in:
   - **Organization**: your GitHub org/username
   - **Repository**: your repo name
   - **Entity**: `Environment`
   - **Environment**: `production`
5. Click **Add**

---

## 6. Environment Configuration

### Copy the template

```bash
cp .env.example .env.local
```

### Set all values

| Variable | Value / How to Generate |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5432/oxthread` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `NEXTAUTH_SECRET` | `openssl rand -hex 32` |
| `SESSION_EXPIRY_MINUTES` | `30` |
| `GITHUB_TOKEN` | The fine-grained PAT from step 3 |
| `GITHUB_ORG` | Your GitHub org or username |
| `AZURE_CLIENT_ID` | From step 4 |
| `AZURE_CLIENT_SECRET` | From step 4 |
| `AZURE_TENANT_ID` | From step 4 |
| `AZURE_SUBSCRIPTION_ID` | From step 4 |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` (dev) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `SCHEDULER_API_KEY` | `openssl rand -hex 32` |
| `SEED_ADMIN_USERNAME` | `admin` |
| `SEED_ADMIN_PASSWORD` | `Admin@12345!` (change in production) |

---

## 7. Install & Run

Two options: **local** (Node.js directly) or **Docker**.

### Option A: Local (for development)

```bash
# 1. Create the database (Prisma's db push only creates tables, not the DB itself)
createdb oxthread

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema
npx prisma db push

# 5. Seed admin user
npx prisma db seed

# 6. Start dev server
npm run dev
```

### Option B: Docker (for production-like environment)

```bash
# 1. Build and start both app + PostgreSQL
docker compose up --build -d

# 2. Run schema sync + seed (first time only)
docker compose exec app npx prisma db push
docker compose exec app npx prisma db seed

# 3. App runs at http://localhost:3000
```

The Docker setup uses a multi-stage build (`.next/standalone`) with PostgreSQL 15 on a persistent volume. Set environment variables in `docker-compose.yml` or use a mounted `.env` file.

Open [http://localhost:3000](http://localhost:3000) and log in with `admin` / `Admin@12345!`.

---

## 8. Verify Connectivity

### GitHub API

```bash
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/YOUR_ORG/YOUR_REPO
```

Expected: 200 with repo details.

### Azure API

```bash
TOKEN=$(curl -s -X POST \
  "https://login.microsoftonline.com/$AZURE_TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$AZURE_CLIENT_ID" \
  -d "scope=https://management.azure.com/.default" \
  -d "client_secret=$AZURE_CLIENT_SECRET" \
  -d "grant_type=client_credentials" | jq -r '.access_token')

curl -H "Authorization: Bearer $TOKEN" \
  "https://management.azure.com/subscriptions/$AZURE_SUBSCRIPTION_ID/\
resourceGroups?api-version=2021-04-01"
```

Expected: 200 with list of resource groups.

---

## 9. Using the Pipeline Generator

1. Go to `/dashboard/pipelines`
2. **Step 1**: Enter your Azure Container App name → click **Verify**
3. **Step 2**: Select GitHub repo + branch → click **Verify OIDC & GitHub Setup**
4. **Step 3**: Enter app name, select framework and region → click **Create Pipeline**

The generator will:
1. Check if `AZURE_CREDENTIALS` secret exists (skip if yes)
2. Create the secret in your GitHub repo
3. Push `.github/workflows/deploy.yml` + optional `Dockerfile`
4. Register a webhook for deploy status callbacks
5. Check if OIDC federated credential exists (skip if yes)
6. Create the federated credential in Azure AD

After generation, the workflow triggers automatically on push. Monitor it at GitHub → Your Repo → Actions.

---

## Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| GitHub API 404 | Repo doesn't exist or token lacks access | Create repo, grant token access to it |
| GitHub API 403 | Token missing write permission | Update fine-grained PAT permissions |
| Azure API 403/AuthorizationFailed | SP not granted role on subscription | Assign Contributor role to SP |
| "Not all values are present" in workflow | `AZURE_CREDENTIALS` secret missing | Re-run Step 3 (secret is now created before push) |
| Graph API 403 listing credentials | App missing `Application.ReadWrite.All` | Grant API permission + admin consent |
| Webhook not reaching localhost | No public URL | Use ngrok or deploy; webhook is non-blocking on localhost |
| Pipeline stuck at GENERATED | Webhook not registered yet | Set `NEXT_PUBLIC_BASE_URL` and re-generate |
