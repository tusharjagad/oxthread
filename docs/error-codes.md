# Error Codes

All API responses include a `code` field for programmatic error identification.

| Code | Meaning | Common Causes |
|---|---|---|
| `DB_CONNECTION_FAILED` | Cannot reach the database | PostgreSQL not running, wrong host/port, firewall, credentials expired |
| `DB_QUERY_FAILED` | SQL query error | Invalid syntax, constraint violation, schema mismatch |
| `DB_DUPLICATE_ENTRY` | Unique constraint violation | Creating a record that already exists (e.g. duplicate username) |
| `DB_NOT_FOUND` | Record does not exist | Server, user, or database not found in OxThread |
| `DB_FOREIGN_KEY` | Related record missing | Deleting a resource that other records depend on |
| `DB_ROLE_EXISTS` | PostgreSQL role already exists | Creating a user that already exists on the server |
| `DB_PERMISSION_DENIED` | Insufficient PostgreSQL privileges | Running an operation without the required DB grants |
| `AUTH_INVALID_CREDENTIALS` | Wrong access key or password | Typo in credentials |
| `AUTH_ACCOUNT_DISABLED` | Account is disabled by an admin | Contact your OxThread administrator |
| `AUTH_ACCOUNT_LOCKED` | Too many failed login attempts | Wait or contact an admin to unlock |
| `AUTH_TOTP_REQUIRED` | Two-factor authentication needed | Enter TOTP code to continue |
| `AUTH_SESSION_EXPIRED` | Session has timed out | Re-authenticate |
| `AUTH_UNAUTHORIZED` | Not logged in | Login first |
| `AUTH_FORBIDDEN` | Insufficient role permissions | Your role doesn't allow this action |
| `VALIDATION_ERROR` | Invalid input data | Missing fields, wrong format, out-of-range values |
| `NOT_FOUND` | Resource not found | The requested server, user, or pipeline doesn't exist |
| `CONFLICT` | Resource state conflict | Cannot delete a server that has active users |
| `RATE_LIMITED` | Too many requests | Slow down and retry |
| `GITHUB_API_ERROR` | GitHub API call failed | Invalid token, wrong repo name, rate limit |
| `WEBHOOK_INVALID_SIGNATURE` | Webhook HMAC verification failed | Mismatched webhook secret |
| `INTERNAL_ERROR` | Unclassified error | Check server logs for details |

## How to use

**Frontend**: Display the `code` in a monospace badge for debugging:

```tsx
<div>Error: {error.message}</div>
<code style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
  {error.code}
</code>
```

**Adding new codes**: Edit `src/lib/errors.ts`:

1. Add the code key to the `ErrorCodes` object
2. Add a mapping in the `ERRORS_BY_CODE` table with the Prisma/PG error code
3. Optionally add a message keyword fallback in `errorResponse()`
