# Changelog

## 0.7.0 (Current) — 2026-07-03

### Added
- **Connection string copy on user creation** (`/dashboard/postgresql/users`) — after creating a PostgreSQL user, the modal now shows the full `postgres://username:password@host:port/dbname?sslmode=require` connection string with a copy button, ready to share with the team.
- **Connection string copy for existing users** (`/dashboard/postgresql/users`) — new "Copy Connection String" button per user row copies `postgres://username:PASSWORD@host:port/database?sslmode=require` (replace `PASSWORD` with actual password).
- **POST /api/postgres/users response** — now returns `serverHost`, `serverPort`, `serverName`, and `sslEnabled` so the frontend can build the connection string.

### Added
- **Create Database API** (`POST /api/postgres/databases`) — creates a database on a registered PostgreSQL server with Zod validation, RBAC (ADMIN+), duplicate check, and audit logging.
- **Create Database UI** (`/dashboard/postgresql/databases`) — inline modal with server selection, database name, optional owner field; refreshes table on creation.

### Changed
- **Login page premium redesign** (`/app/login/page.tsx`) — 40/60 split layout with left branding panel and right login card. Premium glassmorphism card (28px border-radius, 32px blur, deeper shadow, 44px padding, 520px width). Blue→Cyan gradient button with glow. Clamp-based headline sizing (48-72px). Better spaced typography, improved form inputs with focus glow. Premium DevOps SVG illustration with CI/CD, K8s, Docker, monitoring, shield, AI nodes, animated pulse rings. Subtle radial gradient background glows, 18 floating particles with CSS custom property timing. All existing auth functionality preserved.
- **Login page v2 refinements** (`/app/login/page.tsx`) — heading reduced from 72px to clamp(42px,4.5vw,60px); logo increased 20% with "Enterprise DevOps Automation Platform" subtitle; card deeper with 48px blur, inner shadow, top highlight, border glow; card width 560px; inputs 52px height; button hover glow + translateY(-1px) + press scale(0.98); footer updated to "© 2026 oxThread — Enterprise DevOps Automation — v1.0.0"; animated eye icon toggle; animated chevron on Sign In; particle count increased to 24; item stagger entrance animations; background glow strengthened; unused ReactNode import removed.
- **Login page v3 refinements** (`/app/login/page.tsx`) — input backgrounds darkened to `#0C1628` (matching GitHub/Linear/Vercel dark theme); input height increased to 54px with 19px padding; Access Key field now masked by default with show/hide toggle (type="password"); card padding increased to `48px 48px 40px`; card border opacity 0.07→0.12 with enhanced shadow; "Welcome Back" heading changed to 40px font-weight 700; subtitle 16px opacity 0.7; labels font-weight 600 opacity 0.85; Forgot Password reduced blue saturation + hover underline; button ripple effect on click + lock icon rotation on hover; footer moved to card bottom with border-top divider showing "© 2026 oxThread" and "Version 0.1.0"; FocusWrapper background `#0C1628` with hover lift (translateY -1px).
- **Login page v4 refinements** (`/app/login/page.tsx`) — heading reduced 10% to `clamp(38px,4vw,54px)`; card entrance sped to 400ms; card depth enhanced with cyan edge glow `rgba(17,216,195,0.06)` and stronger shadow; right panel now has faint grid (opacity 0.02) and two radial glows behind card; background parallax on mouse move (3px translate); status indicator "All Systems Operational" with green pulse dot above card header; input padding increased to 21px (~58px height); placeholder text brightened via `::placeholder` CSS; autofill background fixed; FocusWrapper focus ring strengthened to 0.25 opacity + 30px blur; button hover glow spread to `0 0 30px rgba(36,107,255,0.12)`; footer re-laid out with "Enterprise DevOps Automation" + "Version 1.0.0" on separate lines; checkbox upgraded to 20px rounded-[6px] with animated path draw on check mark.
- **Login illustration v2** (`/components/login-illustration.tsx`) — production badge redesigned as green status chip with pulsing dot and "Healthy" label; pipeline pulse dot now has opacity 0.15 glow trail; connection lines breathe via opacity animation.
- **Login illustration redesigned** (`/components/login-illustration.tsx`) — replaced connected node cluster with live animated CI/CD pipeline: Git Commit → CI Build → Docker → K8s Deploy → Cloud → Monitor. Glowing pulse travels through all stages. Stage boxes with SVG icons, labels, animated arrows. "PRODUCTION →" destination tag. Subtle grid background, per-stage breathing glows.
- **Password generation** (`src/lib/postgres/provisioning.ts`) — `generatePassword()` now uses only alphanumeric characters (no special chars) for database compatibility.

### Fixed
- **PostgreSQL pool hanging queries** — added `query_timeout: 30000` to `Pool` constructor and `SET statement_timeout = '30s'` on pool `connect` event in `src/lib/postgres/pool.ts`. Added `SET lock_timeout = '10s'` before `REASSIGN/DROP OWNED BY` in `provisioning.ts`. Silent `.catch()` blocks now re-throw errors instead of swallowing them.
- **SSL disabled for remote PostgreSQL servers** — `sslEnabled` flag from the server record was not propagated to actual database connections. Fixed in `discovery.ts`, `provisioning.ts`, and `test/route.ts` so `PG_LOCAL`-style env vars and server SSL settings are both respected.

## 0.6.0 — 2026-07-01

### Added
- **Access Control page** (`/dashboard/access-control`) — shows the current user's role, a visual overview of all 4 roles with descriptions, and IP access control reference.
- **Integrations page** (`/dashboard/integrations`) — live status cards for GitHub, Azure, and GitHub Webhook connections read from `GET /api/integrations/status`, plus environment variable reference table.
- **Integration status API** (`GET /api/integrations/status`) — server-side endpoint that checks `GITHUB_TOKEN`, `AZURE_CLIENT_ID`/`AZURE_CLIENT_SECRET`, and `NEXT_PUBLIC_BASE_URL` presence.

### Changed
- **Light theme colors** — updated `.light` CSS variables to cooler grays (`#111827` primary text, `#f3f4f6` base background), plus overrides for card hover, glass card, code blocks, modal backdrop, and muted badges.

## 0.5.0 — 2026-06-30

### Added
- **Pipeline detail page** (`/dashboard/pipelines/[id]`) — full deployment lifecycle timeline with step-by-step status (push, webhook, OIDC, secrets, workflow trigger, deploy), GitHub Actions workflow runs list, activity logs, and deployment URL link. Accessible from the create pipeline result panel or the "Your Pipelines" list.
- **Pipeline detail API** (`GET /api/pipelines/[id]`) — returns pipeline record, GitHub Actions workflow runs (polled from GitHub API), and recent audit logs.
- **Enhanced audit logging in pipeline generation** — each sub-step (push, webhook, federated credential, secrets) logged individually to `audit_logs` with `resourceId` linking to the pipeline.
- **Your Pipelines list** on the create pipeline page — shows recent pipelines with status badges, clickable to detail page.
- **`listWorkflowRuns()` / `getWorkflowRun()`** in `src/lib/github/client.ts` — fetches GitHub Actions workflow runs from API.
- **3-step wizard on pipeline creation page** — Step 1: Verify Container App → Step 2: Verify OIDC & GitHub Setup → Step 3: Create Pipeline. Step 2 runs `GET /api/pipelines/verify-setup` checking Azure OIDC federated credential, GitHub secrets API access, webhook URL readiness, Dockerfile status, and all required env vars.
- **Setup verification API** (`GET /api/pipelines/verify-setup`) — standalone endpoint that checks OIDC federated credential creation, GitHub repo secret access, webhook URL configuration, Azure container app, and env var presence. Returns detailed per-check pass/fail results.
- **`checkFederatedCredentialReadiness()`** in `src/lib/azure.ts` — read-only check of OIDC federated credential setup (doesn't create), returns detailed error messages.
- **`createFederatedCredential()` improved** — now returns `CredentialCheckResult` with detailed error messages instead of bare boolean.
- **Pipeline list page** (`/dashboard/pipelines/list`) — full table view of all pipelines with search, pagination, status badges, and per-row delete with confirmation.
- **Delete pipeline API** (`DELETE /api/pipelines/[id]`) — deletes pipeline record and logs to audit log; requires `DEVELOPER` role.
- **"View All" link in Your Pipelines** — "Your Pipelines" card on create page now has a right-aligned "View All" link to the full list page.
- **"New Pipeline" button on list page** — quick action to return to the create page from the list view.
- **Existence validation before creation** — `getRepoSecret()` in `src/lib/github/client.ts` checks if `AZURE_CREDENTIALS` secret exists before creating; `checkFederatedCredentialReadiness()` checks if OIDC federated credential exists before creating, avoiding unnecessary API calls and errors on re-run
- **Local setup documentation** — comprehensive README.md with step-by-step setup, full environment variable reference table with descriptions and "where to find" guidance Azure → Portal paths, GitHub token setup, etc.
- **Added missing env vars to `.env` / `.env.local`** — `NEXT_PUBLIC_BASE_URL` and `SCHEDULER_API_KEY` were read in source code but missing from both env files (only existed in `.env.example`)
- **Teams page** (`/dashboard/teams`) — user management UI with search, pagination, role assignment (SUPER_ADMIN → READ_ONLY), toggle active/locked, unlock with failed login reset, create user modal with one-time access key display, inline delete with Yes/No confirmation. Requires ADMIN/SUPER_ADMIN for mutations; SUPER_ADMIN for delete.
- **Docker deployment documentation** — added Docker Compose setup to README.md and `docs/setup-guide.md` (build, run, schema sync, seed)

### Fixed
- **Secret created after push (race condition)** — `AZURE_CREDENTIALS` secret now created before `pushFiles()` so it exists in GitHub when the workflow triggers, fixing "Not all values are present in AZURE_CREDENTIALS" error
- **Duplicate Step 2 button on pipeline creation page** — removed the inline "Step 2: Verify OIDC & GitHub Setup" button from the OIDC check section; only one button remains in the bottom action bar.
- **Undefined CSS variable `--border`** — all instances of `var(--border)` in pipeline pages replaced with `var(--bg-border)`, fixing invisible card borders and dividers.
- **lucide-react Turbopack crash on all pages** — replaced `lucide-react` barrel imports across all 13 components with `@/lib/icons` (inline SVG icon components). lucide-react v1.21.0 `.mjs` module factories are incompatible with Turbopack's `[app-client]` bundle. New `src/lib/icons.tsx` contains 50+ hand-picked Lucide icons as self-contained SVG components, zero external dependencies.
- **Login API 500 error** — replaced `cookies().set()` (removed in Next.js 16) with `response.cookies.set()` in `src/app/api/auth/login/route.ts:111`.
- **Turbopack module factory crash on `/dashboard`** — removed `Cache-Control: immutable` header from `/_next/static/:path*` in `next.config.ts` (breaks Turbopack HMR). Renamed deprecated `src/middleware.ts` to `src/proxy.ts` and updated export from `middleware` to `proxy`.

## 0.4.0 — 2026-06-29 11:40 IST

### Changed
- **Pipeline generator redesigned** — no longer scaffolds 8 files into repo. Only pushes `.github/workflows/deploy.yml` (+ optional `Dockerfile` if missing). Existing code is never touched.
- **GitHub repo dropdown** — frontend now fetches and displays user's repos from GitHub API. Select a repo to auto-detect framework and populate branch list.
- **Branch dropdown** — branches fetched per-repo. Detection re-runs on branch switch.
- **Auto-detect framework** — scans `package.json`, `requirements.txt`, `Dockerfile` in the selected repo/branch. Falls back to manual selection.
- **Workflow simplified** — single job: login (OIDC) → create RG/ACR if needed → build & push to ACR → deploy to ACA. No Bicep files, no infra scripts, no README.
- **Pipeline form simplified** — removed Dockerfile path, auto-deploy toggle, repo URL fields. Only app name, repo dropdown, branch dropdown, framework, region.
- **Errors in response** — added `code` field to all generate API responses via `errorResponse()` from `src/lib/errors.ts`

### Added
- `GET /api/github/repos` — list user repos
- `GET /api/github/repos/[owner]/[repo]/branches` — list branches
- `GET /api/github/repos/[owner]/[repo]/detect` — detect framework + check Dockerfile
- `listUserRepos()`, `listBranches()`, `getRepoFileContent()`, `detectRepoFramework()` in `src/lib/github/client.ts`

### Removed
- Scaffold files: `infra/main.bicep`, `infra/parameters.json`, `.github/workflows/infra.yml`, `deploy-aca.sh`, `.env.template`, `README.md` — no longer pushed to user repos
- `autoDeploy` and `repoUrl` from pipeline validation schema

## 0.3.0 — 2026-06-26 11:40 IST

### Added
- **Session timeout mechanism** — SUPER_ADMIN can configure session duration via `/dashboard/settings` (1-1440 min). JWT expiry enforces auto-logout. Existing sessions keep original expiry.
- **AppSettings model** — singleton DB row stores `sessionTimeoutMinutes`. API at `GET/PATCH /api/settings` (SUPER_ADMIN only). Audit logged on changes.
- **System settings page** (`/dashboard/settings`) — number input + save for session timeout, info card explaining mechanics. Non-admin users see restricted message.
- **Seed script updated** — creates initial `AppSettings` row (30 min timeout) on first run.

## 0.2.0 — 2026-06-26

### Added
- **Animated login page** — 3 morphing blobs, 35 floating particles, glassmorphism card, mouse-reactive 3D tilt, glow tracking cursor, floating ox logo with rotating ring, gradient title, shimmer button, shake on error, password toggle
- **Error code system** (`src/lib/errors.ts`) — `ErrorCodes` enum (21 codes), `AppError` class, `errorResponse()` helper mapping Prisma/PG/Node errors to user-friendly messages. All API routes now return `code` alongside `error`
- **Audit logs page** (`/dashboard/audit-logs`) — feed-style layout with status dots, resource icons, relative timestamps, debounced search, status filter pills, error code display from metadata, pagination
- **Error codes reference** (`docs/error-codes.md`) — troubleshooting guide listing all codes with meanings and common causes
- **GitHub client** (`src/lib/github/client.ts`) — `pushFiles`, `registerWebhook`, `removeWebhook` for pipeline integration
- **Pipeline webhook receiver** (`POST /api/webhooks/github`) — HMAC-SHA256 verification, updates pipeline status
- **Profile page** (`/dashboard/profile`) — three tabs: details (view/edit username, role, access key, 2FA, last login), password change (current password required, min 8 chars), access key regeneration (password + `REGENERATE` confirmation, shown once with copy)
- **Self-service API** (`PATCH /api/auth/me`) — users can update username, change password, regenerate access key with current password verification
- **Audit logs page redesigned** — feed-style cards with status dots, resource emoji icons, relative timestamps, debounced search, filter pills, error codes from metadata

### Changed
- Login page hydration fixed — particles moved from module-level `Math.random()` to client-only `useEffect`
- Frontend `fetcher` — now throws typed `ApiError` with `code` property instead of plain `Error`
- All catch blocks across API routes use `errorResponse()` — never leak internal error messages
- Pipeline generator now pushes 5 files (infra Bicep + workflow included), deploys via Bicep with OIDC auth

### Security
- OIDC federated credentials replace service principal secrets in deploy workflow
- ACR admin user disabled; image pull via managed identity
