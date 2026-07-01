You are a Principal Security Architect, Principal DevOps Engineer, Staff Software Engineer, Platform Engineer and Database Security Expert.

IMPORTANT:

This is an EXISTING application called OxThread.

OxThread is already running successfully.

NEVER EVER change existing functionality.

NEVER redesign the application.

NEVER replace existing authentication.

NEVER replace existing dashboards.

NEVER replace existing Prisma setup.

NEVER replace existing database schemas unless absolutely required.

NEVER replace existing API routes.

NEVER replace existing middleware/proxy.

NEVER replace existing audit logs.

NEVER replace existing layouts.

NEVER replace existing UI components.

ONLY EXTEND THE EXISTING CODEBASE.

=========================================================
PRIMARY GOAL
=========================================================

Enhance the existing PostgreSQL module.

Current implementation only stores metadata inside OxThread database.

I DO NOT WANT A CRUD TABLE.

I want a real PostgreSQL Access Management platform.

I have already connected PostgreSQL servers.

Users should be able to:

1. Register PostgreSQL servers
2. Discover databases
3. Discover existing PostgreSQL users
4. Create new PostgreSQL users directly
5. Assign permissions
6. Disable users
7. Enable users
8. Rotate passwords
9. Expire users automatically
10. Audit every action

WITHOUT compromising security.

=========================================================
MOST IMPORTANT RULE
=========================================================

Never break any existing OxThread functionality.

Before generating code:

Analyze:

- Existing folder structure
- Existing authentication
- Existing dashboard
- Existing Prisma models
- Existing middleware/proxy
- Existing audit logs
- Existing PostgreSQL module

Then EXTEND it.

Do NOT duplicate systems.

=========================================================
SECURITY FIRST ARCHITECTURE
=========================================================

Browser

↓

OxThread UI

↓

Next.js API Routes

↓

Service Layer

↓

Validation Layer

↓

RBAC Layer

↓

Secret Management Layer

↓

PostgreSQL Servers

The frontend MUST NEVER communicate directly with PostgreSQL servers.

=========================================================
SECURITY RULES (MANDATORY)
=========================================================

Never expose passwords.

Never log passwords.

Never store passwords in plain text.

Never expose admin credentials.

Never expose secrets in frontend.

Never allow arbitrary SQL execution.

Never allow users to enter raw SQL.

Never allow direct database access.

Never bypass RBAC.

Never bypass audit logging.

Never expose stack traces.

Never trust frontend inputs.

=========================================================
SECRET MANAGEMENT
=========================================================

Priority:

1. Azure Key Vault
2. AWS Secrets Manager
3. Hashicorp Vault
4. Environment variables (development only)

Never store:

admin_password

Store only:

secret_reference

=========================================================
POSTGRESQL SERVERS MODULE
=========================================================

Create:

Dashboard

→ PostgreSQL

→ Servers

Capabilities:

Register Server

Edit Server

Enable Server

Disable Server

Delete Server

Test Connection

Fields:

Server Name

Environment

Host

Port

SSL Enabled

Owner Team

Secret Reference

Status

Created Date

Updated Date

=========================================================
DATABASE DISCOVERY
=========================================================

When a server is selected:

Automatically fetch databases.

Execute:

SELECT datname
FROM pg_database
WHERE datistemplate=false
ORDER BY datname;

Display:

Database Name

Owner

Size

Connections

=========================================================
USER DISCOVERY
=========================================================

When a database is selected:

Fetch actual PostgreSQL users.

Use:

pg_roles

Display:

Username

Database

Access Profile

Status

Expiry

Created Date

Last Updated

=========================================================
POSTGRESQL USER CREATION POLICY (MANDATORY)
=========================================================

IMPORTANT:

We use LEAST PRIVILEGE ACCESS.

OxThread MUST NEVER create:

SUPERUSER

CREATEDB

CREATEROLE

REPLICATION

BYPASSRLS

unless an explicit Super Admin workflow exists.

DEFAULT USER CREATION:

CREATE USER username
WITH PASSWORD 'password'
NOSUPERUSER
NOCREATEDB
NOCREATEROLE
NOINHERIT
NOREPLICATION;

=========================================================
ACCESS PROFILES
=========================================================

Do NOT implement:

ReadOnly

ReadWrite

DBAdmin

Implement:

APP_READONLY

APP_READWRITE

APP_ADMIN

=========================================================
APP_READONLY
=========================================================

GRANT CONNECT ON DATABASE database_name TO username;

GRANT USAGE ON SCHEMA public TO username;

GRANT SELECT
ON ALL TABLES IN SCHEMA public
TO username;

GRANT USAGE
ON ALL SEQUENCES IN SCHEMA public
TO username;

REVOKE ALL
ON SCHEMA information_schema
FROM username;

REVOKE ALL
ON SCHEMA pg_catalog
FROM username;

=========================================================
APP_READWRITE (DEFAULT)
=========================================================

This is our organization standard.

CREATE USER username
WITH PASSWORD 'password'
NOSUPERUSER
NOCREATEDB
NOCREATEROLE
NOINHERIT
NOREPLICATION;

GRANT CONNECT
ON DATABASE database_name
TO username;

GRANT USAGE, CREATE
ON SCHEMA public
TO username;

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO username;

GRANT USAGE
ON ALL SEQUENCES IN SCHEMA public
TO username;

REVOKE ALL
ON SCHEMA information_schema
FROM username;

REVOKE ALL
ON SCHEMA pg_catalog
FROM username;

=========================================================
APP_ADMIN
=========================================================

Requires approval.

Allowed:

CREATE

ALTER

Manage application objects

Still NEVER allow:

SUPERUSER

CREATEDB

CREATEROLE

REPLICATION

BYPASSRLS

=========================================================
CREATE USER WORKFLOW
=========================================================

Step 1

Select Server

↓

Step 2

Select Database

↓

Step 3

Enter Username

↓

Step 4

Generate Password

↓

Step 5

Select Access Profile

↓

Step 6

Set Expiry Date

↓

Step 7

Review

↓

Step 8

Provision User

=========================================================
PASSWORD POLICY
=========================================================

Generate passwords automatically.

Requirements:

Minimum 16 characters

Uppercase

Lowercase

Numbers

Special characters

Never display passwords after modal closes.

Allow one-time copy.

Never save passwords in plain text.

=========================================================
ENABLE USER
=========================================================

ALTER ROLE username LOGIN;

=========================================================
DISABLE USER
=========================================================

ALTER ROLE username NOLOGIN;

=========================================================
DELETE USER
=========================================================

REASSIGN OWNED BY username TO postgres;

DROP OWNED BY username;

DROP ROLE username;

=========================================================
PASSWORD ROTATION
=========================================================

Rotate password securely.

ALTER ROLE username PASSWORD 'newpassword';

Audit every rotation.

=========================================================
EXPIRY AUTOMATION
=========================================================

Daily scheduler.

If expiry reached:

ALTER ROLE username NOLOGIN;

Update status.

Notify owner.

=========================================================
ACCESS REQUEST WORKFLOW
=========================================================

Developer requests access.

Approval flow:

Developer

↓

Manager Approval

↓

DevOps Approval

↓

Provision User

States:

Pending

Approved

Rejected

Provisioned

Expired

=========================================================
RBAC
=========================================================

Create roles:

Super Admin

DevOps Admin

Developer

Read Only

Permissions:

Super Admin

Full access

DevOps Admin

Manage PostgreSQL

Developer

Request access only

Read Only

View resources only

Unauthorized access:

HTTP 403

=========================================================
AUDIT LOGGING
=========================================================

Audit EVERYTHING.

Track:

Who

Action

Server

Database

IP

Timestamp

Result

Actions:

LOGIN

CREATE_SERVER

DELETE_SERVER

CREATE_USER

DELETE_USER

ENABLE_USER

DISABLE_USER

ROTATE_PASSWORD

APPROVE_REQUEST

REJECT_REQUEST

Audit logs must be immutable.

Nobody can edit audit logs.

Nobody can delete audit logs.

=========================================================
SECURITY CONTROLS
=========================================================

Mandatory:

RBAC middleware

Session validation

Input validation (Zod)

SQL injection prevention

XSS protection

CSRF protection

Rate limiting

Secure cookies

HttpOnly cookies

SameSite cookies

Environment validation

Secrets masking

Encryption at rest

Request sanitization

=========================================================
SECURITY HEADERS
=========================================================

Implement:

Content-Security-Policy

Strict-Transport-Security

X-Frame-Options

X-Content-Type-Options

Referrer-Policy

Permissions-Policy

=========================================================
UI REQUIREMENTS
=========================================================

DO NOT redesign OxThread.

Reuse existing design system.

Reuse existing layouts.

Reuse existing theme.

Extend only.

Add pages:

PostgreSQL Servers

PostgreSQL Databases

PostgreSQL Users

Access Requests

Audit Logs

Features:

Search

Filters

Pagination

Toast notifications

Confirmation dialogs

Skeleton loading

=========================================================
CODE REQUIREMENTS
=========================================================

Generate production-ready code.

No placeholders.

No mock data.

Generate:

Prisma models

API routes

Services

Validation

RBAC

Hooks

Components

Types

Database adapters

Audit services

Background scheduler

Folder structure

Testing strategy

Error handling

=========================================================
FINAL RULE

NEVER EVER change existing functionality.

NEVER EVER break the running portal.

ONLY EXTEND THE EXISTING CODEBASE.

Before writing code:

1. Analyze the existing codebase.
2. Reuse existing authentication.
3. Reuse existing dashboard.
4. Reuse existing audit logs.
5. Reuse existing layouts.
6. Reuse existing components.
7. Reuse existing Prisma setup.

If a security compromise is possible, choose the most secure implementation.

This platform must be deployable to production without exposing infrastructure credentials.

Generate code incrementally and safely.