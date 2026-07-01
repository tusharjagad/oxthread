import { ErrorCodes, type ErrorCode } from '@/lib/errors'

export class ApiError extends Error {
  code: ErrorCode
  status: number

  constructor(code: ErrorCode, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
    this.name = 'ApiError'
  }
}

const BASE = '/api/postgres'

async function fetcher(url: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  let data: { error?: string; code?: ErrorCode } = {}
  try {
    data = await res.json()
  } catch {
    throw new ApiError(
      ErrorCodes.INTERNAL_ERROR,
      res.ok ? 'Empty response' : `Request failed (${res.status})`,
      res.status
    )
  }

  if (!res.ok) {
    throw new ApiError(
      data.code || ErrorCodes.INTERNAL_ERROR,
      data.error || `Request failed (${res.status})`,
      res.status
    )
  }
  return data
}

export const serversApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    fetcher(`${BASE}/servers?${new URLSearchParams(
      Object.entries(params || {}).filter((entry) => entry[1] !== undefined).map(([k, v]) => [k, String(v)])
    )}`),

  get: (id: string) => fetcher(`${BASE}/servers/${id}`),

  create: (data: Record<string, unknown>) =>
    fetcher(`${BASE}/servers`, { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    fetcher(`${BASE}/servers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (id: string) =>
    fetcher(`${BASE}/servers/${id}`, { method: 'DELETE' }),

  testConnection: (id: string) =>
    fetcher(`${BASE}/servers/${id}/test`, { method: 'POST' }),

  discoverDatabases: (id: string) =>
    fetcher(`${BASE}/servers/${id}/databases`),

  syncDatabases: (id: string) =>
    fetcher(`${BASE}/servers/${id}/databases`, { method: 'POST' }),
}

export const usersApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    fetcher(`${BASE}/users?${new URLSearchParams(
      Object.entries(params || {}).filter((entry) => entry[1] !== undefined).map(([k, v]) => [k, String(v)])
    )}`),

  create: (data: Record<string, unknown>) =>
    fetcher(`${BASE}/users`, { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    fetcher(`${BASE}/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (id: string) =>
    fetcher(`${BASE}/users/${id}`, { method: 'DELETE' }),

  rotatePassword: (id: string) =>
    fetcher(`${BASE}/users/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'rotate-password' }),
    }),
}

export const accessRequestsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    fetcher(`${BASE}/access-requests?${new URLSearchParams(
      Object.entries(params || {}).filter((entry) => entry[1] !== undefined).map(([k, v]) => [k, String(v)])
    )}`),

  create: (data: Record<string, unknown>) =>
    fetcher(`${BASE}/access-requests`, { method: 'POST', body: JSON.stringify(data) }),

  approve: (id: string) =>
    fetcher(`${BASE}/access-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    }),

  reject: (id: string) =>
    fetcher(`${BASE}/access-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reject' }),
    }),

  remove: (id: string) =>
    fetcher(`${BASE}/access-requests/${id}`, { method: 'DELETE' }),
}
