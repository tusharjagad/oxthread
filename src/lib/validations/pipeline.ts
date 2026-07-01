import { z } from 'zod'

export const generatePipelineSchema = z.object({
  appName: z.string().min(1, 'App name is required').max(100),
  framework: z.enum(['nextjs', 'react', 'nodejs', 'python', 'fastapi']),
  azureRegion: z.string().optional(),
  containerApp: z.string().optional(),
  githubOrg: z.string().min(1, 'GitHub org is required'),
  githubRepo: z.string().min(1, 'GitHub repo is required'),
  githubBranch: z.string().default('main'),
})
