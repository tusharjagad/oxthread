interface GitHubFile {
  path: string
  content: string
}

interface PushResult {
  success: boolean
  commitSha?: string
  error?: string
}

interface WebhookResult {
  success: boolean
  webhookId?: number
  error?: string
}

function getToken(): string {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN environment variable is not set')
  return token
}

function apiUrl(path: string): string {
  return `https://api.github.com${path}`
}

async function ghFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'OxThread-Pipeline-Generator',
      ...options.headers,
    },
  })
  return res
}

export interface RepoInfo {
  id: number
  fullName: string
  name: string
  owner: string
  private: boolean
  defaultBranch: string
}

export interface BranchInfo {
  name: string
  commitSha: string
}

export async function getRepoDefaultBranch(org: string, repo: string): Promise<string> {
  const res = await ghFetch(`/repos/${org}/${repo}`)
  if (!res.ok) throw new Error(`Failed to get repo info: ${res.status}`)
  const data = await res.json()
  return data.default_branch || 'main'
}

export async function listUserRepos(): Promise<RepoInfo[]> {
  const repos: RepoInfo[] = []
  let page = 1
  while (true) {
    const res = await ghFetch(`/user/repos?per_page=100&page=${page}&sort=updated&type=all`)
    if (!res.ok) throw new Error(`Failed to list repos: ${res.status}`)
    const data = await res.json()
    for (const r of data) {
      repos.push({
        id: r.id,
        fullName: r.full_name,
        name: r.name,
        owner: r.owner.login,
        private: r.private,
        defaultBranch: r.default_branch || 'main',
      })
    }
    if (data.length < 100) break
    page++
  }
  return repos
}

export async function listBranches(org: string, repo: string): Promise<BranchInfo[]> {
  const res = await ghFetch(`/repos/${org}/${repo}/branches?per_page=100`)
  if (!res.ok) throw new Error(`Failed to list branches: ${res.status}`)
  const data = await res.json()
  return data.map((b: { name: string; commit: { sha: string } }) => ({
    name: b.name,
    commitSha: b.commit.sha,
  }))
}

export async function getRepoFileContent(
  org: string,
  repo: string,
  path: string,
  branch: string
): Promise<string | null> {
  const res = await ghFetch(`/repos/${org}/${repo}/contents/${path}?ref=${branch}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to get ${path}: ${res.status}`)
  const data = await res.json()
  if (data.type !== 'file') return null
  return Buffer.from(data.content, 'base64').toString('utf-8')
}

async function getFileSha(org: string, repo: string, path: string, branch: string): Promise<string | null> {
  const res = await ghFetch(`/repos/${org}/${repo}/contents/${path}?ref=${branch}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to check file ${path}: ${res.status}`)
  const data = await res.json()
  return data.sha
}

export async function pushFiles(
  org: string,
  repo: string,
  branch: string,
  files: GitHubFile[],
  commitMessage: string
): Promise<PushResult> {
  try {
    const latestCommitRes = await ghFetch(`/repos/${org}/${repo}/git/refs/heads/${branch}`)
    if (!latestCommitRes.ok) {
      return { success: false, error: `Failed to get latest commit: ${latestCommitRes.status}` }
    }
    const refData = await latestCommitRes.json()
    const parentSha = refData.object.sha

    const commitDetailRes = await ghFetch(`/repos/${org}/${repo}/git/commits/${parentSha}`)
    if (!commitDetailRes.ok) {
      return { success: false, error: `Failed to get commit details: ${commitDetailRes.status}` }
    }
    const commitDetail = await commitDetailRes.json()
    const baseTreeSha = commitDetail.tree.sha

    const res = await ghFetch(`/repos/${org}/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: files.map((f) => ({
          path: f.path,
          mode: '100644',
          type: 'blob',
          content: f.content,
        })),
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: `Failed to create tree: ${err}` }
    }
    const treeData = await res.json()

    const commitRes = await ghFetch(`/repos/${org}/${repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: commitMessage,
        tree: treeData.sha,
        parents: [parentSha],
      }),
    })
    if (!commitRes.ok) {
      const err = await commitRes.text()
      return { success: false, error: `Failed to create commit: ${err}` }
    }
    const commitData = await commitRes.json()

    const updateRefRes = await ghFetch(`/repos/${org}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commitData.sha, force: false }),
    })
    if (!updateRefRes.ok) {
      const err = await updateRefRes.text()
      return { success: false, error: `Failed to update ref: ${err}` }
    }

    return { success: true, commitSha: commitData.sha }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function registerWebhook(
  org: string,
  repo: string,
  callbackUrl: string,
  secret: string
): Promise<WebhookResult> {
  try {
    const res = await ghFetch(`/repos/${org}/${repo}/hooks`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['workflow_run'],
        config: {
          url: callbackUrl,
          content_type: 'json',
          secret,
          insecure_ssl: '0',
        },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: `Failed to register webhook: ${err}` }
    }
    const data = await res.json()
    return { success: true, webhookId: data.id }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function removeWebhook(org: string, repo: string, webhookId: number): Promise<boolean> {
  const res = await ghFetch(`/repos/${org}/${repo}/hooks/${webhookId}`, { method: 'DELETE' })
  return res.ok
}

export async function getRepoSecret(
  org: string,
  repo: string,
  secretName: string
): Promise<boolean> {
  const res = await ghFetch(`/repos/${org}/${repo}/actions/secrets/${secretName}`)
  return res.ok
}

export async function createOrUpdateRepoSecret(
  org: string,
  repo: string,
  secretName: string,
  secretValue: string
): Promise<boolean> {
  try {
    const pubKeyRes = await ghFetch(`/repos/${org}/${repo}/actions/secrets/public-key`)
    if (!pubKeyRes.ok) return false
    const { key, key_id } = await pubKeyRes.json()

    const sodium = await import('libsodium-wrappers').then(m => (m.default || m) as typeof import('libsodium-wrappers'))
    if (typeof sodium.ready?.then === 'function') await sodium.ready
    const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL)
    const encryptedBytes = sodium.crypto_box_seal(Buffer.from(secretValue), binKey)
    const encryptedValue = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL)

    const res = await ghFetch(`/repos/${org}/${repo}/actions/secrets/${secretName}`, {
      method: 'PUT',
      body: JSON.stringify({ encrypted_value: encryptedValue, key_id }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      console.error(`GitHub secrets API error (${res.status}): ${errText}`)
    }
    return res.ok
  } catch (e) {
    console.error('Failed to create secret:', e)
    return false
  }
}

export interface RepoDetection {
  hasDockerfile: boolean
  detectedFramework: string
  frameworks: { value: string; label: string }[]
}

export async function detectRepoFramework(org: string, repo: string, branch: string): Promise<RepoDetection> {
  const dockerfile = await getRepoFileContent(org, repo, 'Dockerfile', branch)
  const dockerfileLower = await getRepoFileContent(org, repo, 'dockerfile', branch)
  const hasDockerfile = !!(dockerfile || dockerfileLower)

  const packageJson = await getRepoFileContent(org, repo, 'package.json', branch)
  const requirementsTxt = await getRepoFileContent(org, repo, 'requirements.txt', branch)
  const mainPy = await getRepoFileContent(org, repo, 'main.py', branch)
  const appPy = await getRepoFileContent(org, repo, 'app.py', branch)
  const indexJs = await getRepoFileContent(org, repo, 'index.js', branch)
  const viteConfig = await getRepoFileContent(org, repo, 'vite.config.ts', branch)
    || await getRepoFileContent(org, repo, 'vite.config.js', branch)

  let detectedFramework = 'nodejs'
  const frameworks: { value: string; label: string }[] = []

  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson)
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps.next) {
        detectedFramework = 'nextjs'
      } else if (deps.react || deps['react-dom']) {
        detectedFramework = viteConfig ? 'react' : 'react'
      } else {
        detectedFramework = 'nodejs'
      }
    } catch {
      detectedFramework = 'nodejs'
    }
  } else if (requirementsTxt || mainPy || appPy) {
    const req = (requirementsTxt || '').toLowerCase()
    if (req.includes('fastapi') || req.includes('uvicorn')) {
      detectedFramework = 'fastapi'
    } else {
      detectedFramework = 'python'
    }
  }

  FRAMEWORK_LIST.forEach((fw) => {
    frameworks.push({ value: fw.value, label: fw.label })
  })

  return { hasDockerfile, detectedFramework, frameworks }
}

export interface WorkflowRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  headBranch: string
  headSha: string
  runNumber: number
  htmlUrl: string
  createdAt: string
  updatedAt: string
}

export async function listWorkflowRuns(
  org: string,
  repo: string,
  branch?: string,
  perPage = 5
): Promise<WorkflowRun[]> {
  try {
    let path = `/repos/${org}/${repo}/actions/runs?per_page=${perPage}`
    if (branch) path += `&branch=${branch}`
    const res = await ghFetch(path)
    if (!res.ok) return []
    const data = await res.json()
    return (data.workflow_runs || []).map((r: Record<string, unknown>) => ({
      id: r.id as number,
      name: (r.name as string) || '',
      status: r.status as string,
      conclusion: (r.conclusion as string) || null,
      headBranch: r.head_branch as string,
      headSha: r.head_sha as string,
      runNumber: r.run_number as number,
      htmlUrl: r.html_url as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    }))
  } catch {
    return []
  }
}

export async function getWorkflowRun(org: string, repo: string, runId: number): Promise<WorkflowRun | null> {
  try {
    const res = await ghFetch(`/repos/${org}/${repo}/actions/runs/${runId}`)
    if (!res.ok) return null
    const r = await res.json()
    return {
      id: r.id,
      name: r.name || '',
      status: r.status,
      conclusion: r.conclusion || null,
      headBranch: r.head_branch,
      headSha: r.head_sha,
      runNumber: r.run_number,
      htmlUrl: r.html_url,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
  } catch {
    return null
  }
}

const FRAMEWORK_LIST = [
  { value: 'nextjs', label: 'Next.js' },
  { value: 'react', label: 'React' },
  { value: 'nodejs', label: 'Node.js' },
  { value: 'python', label: 'Python' },
  { value: 'fastapi', label: 'FastAPI' },
]
