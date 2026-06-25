import type { AxiResolveContextInput } from 'axi-sdk-js'
import { getFlag } from './args.js'

export interface JiraContext {
  project: string
}

export function resolveContext({ args }: AxiResolveContextInput): JiraContext | undefined {
  const project = getFlag(args, '-p') ?? getFlag(args, '--project') ?? process.env['JIRA_AXI_PROJECT']
  if (project) return { project }
  return undefined
}

export function stripProjectArgs(args: string[]): string[] {
  const result = [...args]
  for (const flag of ['-p', '--project']) {
    const idx = result.indexOf(flag)
    if (idx >= 0) result.splice(idx, 2)
  }
  return result.filter(a => !a.startsWith('--project='))
}
