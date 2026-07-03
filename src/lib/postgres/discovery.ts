import { resolveCredentials } from './secrets'
import { query } from './pool'
import { prisma } from '@/lib/prisma'

interface DiscoveredDatabase {
  name: string
  owner: string | null
  size: string | null
  connections: number | null
}

interface DiscoveredRole {
  username: string
  canLogin: boolean
  superuser: boolean
  createdb: boolean
  createrole: boolean
  replication: boolean
  bypassrls: boolean
  memberOf: string[]
}

export async function discoverDatabases(serverId: string): Promise<DiscoveredDatabase[]> {
  const server = await prisma.postgresServer.findUnique({ where: { id: serverId } })
  if (!server) throw new Error('Server not found')

  const creds = await resolveCredentials(server.secretRef)
  const adminCreds = { ...creds, ssl: server.sslEnabled || creds.ssl, database: 'postgres' }

  const result = await query(
    adminCreds,
    `SELECT d.datname AS name,
            pg_catalog.pg_get_userbyid(d.datdba) AS owner,
            pg_catalog.pg_database_size(d.datname) AS size_bytes,
            COALESCE(s.numbackends, 0) AS connections
     FROM pg_catalog.pg_database d
     LEFT JOIN pg_catalog.pg_stat_database s ON s.datname = d.datname
     WHERE d.datistemplate = false
     ORDER BY d.datname`
  )

  return result.rows.map((row) => ({
    name: row.name,
    owner: row.owner,
    size: formatBytes(row.size_bytes),
    connections: row.connections,
  }))
}

export async function discoverRoles(serverId: string): Promise<DiscoveredRole[]> {
  const server = await prisma.postgresServer.findUnique({ where: { id: serverId } })
  if (!server) throw new Error('Server not found')

  const creds = await resolveCredentials(server.secretRef)
  const adminCreds = { ...creds, ssl: server.sslEnabled || creds.ssl, database: 'postgres' }

  const result = await query(
    adminCreds,
    `SELECT r.rolname AS username,
            r.rolcanlogin AS can_login,
            r.rolsuper AS superuser,
            r.rolcreatedb AS createdb,
            r.rolcreaterole AS createrole,
            r.rolreplication AS replication,
            r.rolbypassrls AS bypassrls,
            ARRAY(SELECT b.rolname
                  FROM pg_catalog.pg_auth_members m
                  JOIN pg_catalog.pg_roles b ON (m.roleid = b.oid)
                  WHERE m.member = r.oid) AS member_of
     FROM pg_catalog.pg_roles r
     WHERE r.rolname !~ '^pg_'
     ORDER BY r.rolname`
  )

  return result.rows.map((row) => ({
    username: row.username,
    canLogin: row.can_login,
    superuser: row.superuser,
    createdb: row.createdb,
    createrole: row.createrole,
    replication: row.replication,
    bypassrls: row.bypassrls,
    memberOf: row.member_of || [],
  }))
}

export async function syncDatabases(serverId: string): Promise<number> {
  const server = await prisma.postgresServer.findUnique({ where: { id: serverId } })
  if (!server) throw new Error('Server not found')

  const databases = await discoverDatabases(serverId)

  let synced = 0
  for (const db of databases) {
    const existing = await prisma.postgresDatabase.findUnique({
      where: { serverId_name: { serverId, name: db.name } },
    })

    if (!existing) {
      await prisma.postgresDatabase.create({
        data: {
          name: db.name,
          owner: db.owner,
          size: db.size,
          connections: db.connections,
          serverId,
        },
      })
      synced++
    } else {
      await prisma.postgresDatabase.update({
        where: { id: existing.id },
        data: {
          owner: db.owner,
          size: db.size,
          connections: db.connections,
        },
      })
    }
  }

  return synced
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}
