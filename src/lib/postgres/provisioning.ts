import { resolveCredentials } from './secrets'
import { query, getClient } from './pool'
import { PoolClient } from 'pg'
import { AccessProfile } from '@prisma/client'

export function generatePassword(length = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  let password = ''
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
  password += '0123456789'[Math.floor(Math.random() * 10)]

  for (let i = 3; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export async function createPostgresUser(
  connectionInfo: { host: string; port: number; ssl: boolean; secretRef: string; adminDatabase?: string },
  params: {
    username: string
    password: string
    databaseName: string
    accessProfile: AccessProfile
  }
): Promise<void> {
  const creds = await resolveCredentials(connectionInfo.secretRef)
  const adminCreds = { ...creds, ssl: connectionInfo.ssl || creds.ssl, database: connectionInfo.adminDatabase || 'postgres' }

  let adminClient: PoolClient | null = null
  try {
    adminClient = await getClient(adminCreds)
    const escapedPassword = adminClient.escapeLiteral(params.password)
    await adminClient.query(
      `CREATE USER "${params.username}"
       WITH PASSWORD ${escapedPassword}
       NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION`
    )
  } finally {
    if (adminClient) adminClient.release()
  }

  if (!params.databaseName) return

  const targetCreds = { ...creds, ssl: connectionInfo.ssl || creds.ssl, database: params.databaseName }
  let targetClient: PoolClient | null = null
  try {
    targetClient = await getClient(targetCreds)
    await targetClient.query("SET lock_timeout = '10s'")
    await targetClient.query('BEGIN')

    const grants = getGrantsForProfile(params.accessProfile, params.databaseName)
    for (const sql of grants) {
      await targetClient.query(sql.replace(/\$username/g, params.username))
    }

    await targetClient.query('COMMIT')
  } catch (error) {
    if (targetClient) await targetClient.query('ROLLBACK')
    throw error
  } finally {
    if (targetClient) targetClient.release()
  }
}

export async function enableUser(
  secretRef: string,
  username: string,
  adminDatabase?: string
): Promise<void> {
  const creds = await resolveCredentials(secretRef)
  const adminCreds = { ...creds, database: adminDatabase || 'postgres' }
  await query(adminCreds, `ALTER ROLE "${username}" LOGIN`)
}

export async function disableUser(
  secretRef: string,
  username: string,
  adminDatabase?: string
): Promise<void> {
  const creds = await resolveCredentials(secretRef)
  const adminCreds = { ...creds, database: adminDatabase || 'postgres' }
  await query(adminCreds, `ALTER ROLE "${username}" NOLOGIN`)
}

export async function deleteUser(
  secretRef: string,
  username: string,
  targetDatabases?: string[],
  adminDatabase?: string
): Promise<void> {
  const creds = await resolveCredentials(secretRef)

  for (const dbName of targetDatabases || []) {
    const dbCreds = { ...creds, database: dbName }
    let dbClient: PoolClient | null = null
    try {
      dbClient = await getClient(dbCreds)
      await dbClient.query("SET lock_timeout = '10s'")
      await dbClient.query('BEGIN')
      await dbClient.query(`REASSIGN OWNED BY "${username}" TO postgres`)
      await dbClient.query(`DROP OWNED BY "${username}"`)
      await dbClient.query('COMMIT')
    } catch (error) {
      if (dbClient) await dbClient.query('ROLLBACK')
      throw error
    } finally {
      if (dbClient) dbClient.release()
    }
  }

  const adminCreds = { ...creds, database: adminDatabase || 'postgres' }

  let client: PoolClient | null = null
  try {
    client = await getClient(adminCreds)
    await client.query("SET lock_timeout = '10s'")
    await client.query('BEGIN')

    await client.query(`REASSIGN OWNED BY "${username}" TO postgres`)
    await client.query(`DROP OWNED BY "${username}"`)
    await client.query(`DROP ROLE IF EXISTS "${username}"`)

    await client.query('COMMIT')
  } catch (error) {
    if (client) await client.query('ROLLBACK')
    throw error
  } finally {
    if (client) client.release()
  }
}

export async function rotatePassword(
  secretRef: string,
  username: string,
  newPassword: string,
  adminDatabase?: string
): Promise<void> {
  const creds = await resolveCredentials(secretRef)
  const adminCreds = { ...creds, database: adminDatabase || 'postgres' }
  let client: PoolClient | null = null
  try {
    client = await getClient(adminCreds)
    const escapedPassword = client.escapeLiteral(newPassword)
    await client.query(`ALTER ROLE "${username}" PASSWORD ${escapedPassword}`)
  } finally {
    if (client) client.release()
  }
}

export async function checkUserExists(
  secretRef: string,
  username: string,
  adminDatabase?: string
): Promise<boolean> {
  const creds = await resolveCredentials(secretRef)
  const adminCreds = { ...creds, database: adminDatabase || 'postgres' }
  const result = await query(
    adminCreds,
    `SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1`,
    [username]
  )
  return result.rows.length > 0
}

function getGrantsForProfile(profile: AccessProfile, databaseName: string): string[] {
  const db = `"${databaseName}"`

  switch (profile) {
    case 'APP_READONLY':
      return [
        `GRANT CONNECT ON DATABASE ${db} TO $username`,
        `GRANT USAGE ON SCHEMA public TO $username`,
        `GRANT SELECT ON ALL TABLES IN SCHEMA public TO $username`,
        `GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO $username`,
        `REVOKE ALL ON SCHEMA information_schema FROM $username`,
        `REVOKE ALL ON SCHEMA pg_catalog FROM $username`,
      ]
    case 'APP_READWRITE':
      return [
        `GRANT CONNECT ON DATABASE ${db} TO $username`,
        `GRANT USAGE, CREATE ON SCHEMA public TO $username`,
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $username`,
        `GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO $username`,
        `REVOKE ALL ON SCHEMA information_schema FROM $username`,
        `REVOKE ALL ON SCHEMA pg_catalog FROM $username`,
      ]
    case 'APP_ADMIN':
      return [
        `GRANT CONNECT ON DATABASE ${db} TO $username`,
        `GRANT ALL ON SCHEMA public TO $username`,
        `GRANT ALL ON ALL TABLES IN SCHEMA public TO $username`,
        `GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO $username`,
        `GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO $username`,
        `REVOKE ALL ON SCHEMA information_schema FROM $username`,
        `REVOKE ALL ON SCHEMA pg_catalog FROM $username`,
      ]
  }
}
