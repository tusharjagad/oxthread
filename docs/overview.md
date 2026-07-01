# OxThread — Architecture & Functional Overview

## What is OxThread?

OxThread is a dashboard application with two distinct feature areas:

1. **CI/CD Pipeline Generator** — Creates GitHub Actions workflows that deploy your app to Azure Container Apps using OIDC authentication.
2. **PostgreSQL Database Manager** — Manages PostgreSQL servers, databases, users, and access requests through a web UI.

Both features share the same authentication system, audit log, and role-based access control.

---

## 1. CI/CD Pipeline Generator

### Purpose

Automates the creation of a GitHub Actions deployment pipeline for any GitHub repo targeting Azure Container Apps. No manual YAML editing, no Azure CLI commands — the pipeline is generated and pushed in one click.

### How It Works

```
User fills form → Verify Setup (Step 1 & 2) → Generate (Step 3)
                                                      │
                                                      ▼
                                              Create AZURE_CREDENTIALS
                                              secret in GitHub repo
                                                      │
                                                      ▼
                                              Push files to GitHub:
                                                • .github/workflows/deploy.yml
                                                • Dockerfile (if missing)
                                                      │
                                                      ▼
                                              Register webhook on repo
                                              (for deploy status callbacks)
                                                      │
                                                      ▼
                                              Create OIDC federated
                                              credential in Azure AD
```

### The Generated Workflow (`.github/workflows/deploy.yml`)

A single `build-and-deploy` job that:

1. **Logs into Azure** via OIDC (`azure/login@v2` with `client-id`, `tenant-id`, `subscription-id` — no secrets)
2. Creates a Resource Group and Azure Container Registry if they don't exist
3. Builds the Docker image and pushes it to ACR (`az acr build`)
4. Deploys to Azure Container App (`az containerapp up`)

### Pre-flight Checks

Before generation, the wizard verifies:

- **Azure Container App exists** — queries Azure Management API
- **OIDC federated credential readiness** — checks Azure AD app registration has `Application.ReadWrite.All` to create credentials
- **GitHub secrets API access** — verifies the token can read/write repo secrets
- **Webhook URL** — checks `NEXT_PUBLIC_BASE_URL` is set for production
- **Dockerfile** — detects if repo already has one (only creates if missing)
- **Required env vars** — validates all Azure credentials are configured

### Key Files

| File | Purpose |
|---|---|
| `src/app/api/pipelines/generate/route.ts` | Orchestrates the full generation flow |
| `src/app/api/pipelines/verify-setup/route.ts` | Runs pre-flight checks |
| `src/lib/github/client.ts` | GitHub API client (push files, secrets, webhooks) |
| `src/lib/azure.ts` | Azure API client (container apps, federated credentials, OIDC) |
| `src/app/dashboard/pipelines/page.tsx` | 3-step wizard UI |

### Pipeline Status Lifecycle

```
GENERATED → [files pushed] → [workflow triggers] → [Azure deploys]
                                                         │
                                                          └── Webhook callback
                                                              updates to DEPLOYED/FAILED
```

### GitHub Token Permissions

Use a **fine-grained** personal access token with these permissions:

| Permission | Level | Reason |
|---|---|---|
| Contents | Write | Push Dockerfile + workflow file |
| Secrets | Write | Create `AZURE_CREDENTIALS` secret |
| Webhooks | Write | Register deploy status webhook |
| Metadata | Read | (auto-included) List repos, branches |

Fine-grained tokens are scoped to specific repos and have narrower permissions than classic PATs.

---

## 2. PostgreSQL Database Manager

### Purpose

Provides a web UI for managing PostgreSQL servers and their users — without touching `psql`, `CREATE USER`, or `GRANT` statements.

### Architecture

```
dashboard UI  ←→  API routes  ←→  Prisma ORM  ←→  OxThread DB (own)
                                           
                                                    ←→  Target PostgreSQL servers
                                                         (live connections)
```

### Features

#### Server Management

- Register external PostgreSQL servers by name, host, port, and `secret_ref` (the env var holding the connection string)
- Test live connectivity — opens a real connection to verify credentials
- Discover databases — queries `pg_catalog` to list all databases on the server
- Sync database list — refreshes from the live server

#### User Management

- Create database users on a live server with auto-generated passwords
- Assign access profiles:
  - `APP_READONLY` — SELECT only
  - `APP_READWRITE` — SELECT, INSERT, UPDATE, DELETE
  - `APP_ADMIN` — ALL PRIVILEGES
- Toggle active/inactive (grants/revokes `CONNECT`)
- Set expiry dates (auto-revoked by scheduler)
- Rotate passwords

#### Access Request System

- Users request access to a specific database on a specific server
- Requests are approved/rejected by admins
- On approval, the DB user is auto-provisioned with the chosen access profile
- Expired/provisioned requests are cleaned up by the scheduler

#### Scheduler

A cron endpoint (`POST /api/scheduler`, authenticated via `SCHEDULER_API_KEY`) that:
- Finds expired PostgreSQL users and disables them
- Finds expired access requests and marks them as EXPIRED

### Key Files

| File | Purpose |
|---|---|
| `src/app/api/postgres/servers/` | Server CRUD + test + database discovery |
| `src/app/api/postgres/users/` | User CRUD + password rotation |
| `src/app/api/postgres/access-requests/` | Request CRUD + approve/reject |
| `src/lib/postgres/` | PostgreSQL client pool, connection testing |
| `src/app/dashboard/postgresql/` | Dashboard UI pages |

---

## 3. Shared Infrastructure

### Authentication

- Access key + password login
- Optional TOTP two-factor authentication
- Session management via JWT cookies with configurable timeout
- Account lockout after 6 failed login attempts

### Roles

| Role | Permissions |
|---|---|
| `SUPER_ADMIN` | Full access, can delete users, manage settings |
| `ADMIN` | Create/manage users, servers, pipelines, approve requests |
| `DEVELOPER` | Create pipelines, view resources, create access requests |
| `READ_ONLY` | View-only access |

### Audit Logging

Every significant action is logged to `audit_logs` with:
- User ID, IP address, user agent
- Action type, resource, resource ID
- Status (SUCCESS/FAILURE) and structured metadata

Audit logs are viewable at `/dashboard/audit-logs` with filtering by action, resource, user, and date range.

### Error Codes

All API errors return a `code` field alongside the error message. See `docs/error-codes.md` for the full reference.

---

## API Route Summary

| Area | Routes |
|---|---|
| Auth | POST login, POST logout, GET/PATCH me |
| Users | GET/POST users, GET/PATCH/DELETE users/[id] |
| Dashboard | GET dashboard stats |
| Settings | GET/PATCH settings |
| Audit Logs | GET audit-logs |
| Secrets | GET/POST secrets, DELETE secrets/[id] |
| GitHub | GET repos, GET repos/[owner]/[name]/branches, detect |
| Azure | GET container-apps/[name] |
| Pipelines | GET/POST pipelines, GET/DELETE pipelines/[id], POST generate, GET verify-setup |
| PostgreSQL | Servers CRUD, Users CRUD, Access Requests CRUD, scheduler |
| Webhooks | POST github webhook receiver |

---

## Tech Stack

| Component | Technology |
|---|---|
| Framework | Next.js 16 (Turbopack, App Router) |
| UI | React 19, Tailwind CSS |
| Database ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT + session cookies, TOTP |
| GitHub API | REST (git trees, commits, actions secrets, webhooks) |
| Azure API | REST (Management, Microsoft Graph) |
| Container | Docker |
