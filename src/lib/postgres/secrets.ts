interface ConnectionCredentials {
  user: string
  password: string
  host: string
  port: number
  database: string
  ssl: boolean
}

const envSecretCache = new Map<string, ConnectionCredentials>()

function getFromEnv(secretRef: string): ConnectionCredentials | null {
  if (envSecretCache.has(secretRef)) {
    return envSecretCache.get(secretRef)!
  }

  const envVar = process.env[secretRef]
  if (!envVar) return null

  try {
    const url = new URL(envVar)
    const creds: ConnectionCredentials = {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: parseInt(url.port || '5432', 10),
      database: url.pathname.replace(/^\//, ''),
      ssl: envVar.includes('sslmode=require') || envVar.includes('ssl=true'),
    }
    envSecretCache.set(secretRef, creds)
    return creds
  } catch {
    const parts = envVar.split('|')
    if (parts.length < 5) return null
    const creds: ConnectionCredentials = {
      user: parts[0],
      password: parts[1],
      host: parts[2],
      port: parseInt(parts[3] || '5432', 10),
      database: parts[4],
      ssl: parts[5] === 'true',
    }
    envSecretCache.set(secretRef, creds)
    return creds
  }
}

export async function resolveCredentials(secretRef: string): Promise<ConnectionCredentials> {
  const fromEnv = getFromEnv(secretRef)
  if (fromEnv) return fromEnv

  throw new Error(`Unable to resolve credentials for secret reference: ${secretRef}. Ensure the environment variable ${secretRef} is set.`)
}

export function maskConnectionString(conn: ConnectionCredentials): string {
  return `postgresql://${conn.user}:****@${conn.host}:${conn.port}/${conn.database}`
}
