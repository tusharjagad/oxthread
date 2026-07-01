import { Pool, PoolClient } from 'pg'

interface ServerConnection {
  host: string
  port: number
  user: string
  password: string
  database: string
  ssl: boolean
}

const connectionCache = new Map<string, Pool>()

export function getConnectionKey(conn: ServerConnection): string {
  return `${conn.host}:${conn.port}:${conn.database}:${conn.user}`
}

export function createPool(conn: ServerConnection): Pool {
  const key = getConnectionKey(conn)
  if (connectionCache.has(key)) {
    return connectionCache.get(key)!
  }

  const pool = new Pool({
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    database: conn.database,
    ssl: conn.ssl ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })

  connectionCache.set(key, pool)
  return pool
}

export async function getClient(conn: ServerConnection): Promise<PoolClient> {
  const pool = createPool(conn)
  const client = await pool.connect()
  return client
}

export async function testConnection(conn: ServerConnection): Promise<{ ok: boolean; error?: string }> {
  let client: PoolClient | null = null
  try {
    client = await getClient(conn)
    await client.query('SELECT 1')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  } finally {
    if (client) client.release()
  }
}

export async function closePool(conn: ServerConnection): Promise<void> {
  const key = getConnectionKey(conn)
  const pool = connectionCache.get(key)
  if (pool) {
    await pool.end()
    connectionCache.delete(key)
  }
}

export async function query(conn: ServerConnection, text: string, params?: unknown[]) {
  let client: PoolClient | null = null
  try {
    client = await getClient(conn)
    const result = await client.query(text, params)
    return result
  } finally {
    if (client) client.release()
  }
}
