import { acliJson, unwrapValues } from '../acli.js'
import type { JiraContext } from '../context.js'
import { custom, renderList, renderHelp, renderOutput } from '../toon.js'

export const PROJECT_HELP = `
usage: jira-axi project <subcommand> [flags]
subcommands[1]:
  list
examples:
  jira-axi project list
`.trim()

const projectSchema = [
  custom('key', item => item.key),
  custom('name', item => item.name),
  custom('type', item => item.projectTypeKey ?? null),
  custom('lead', item => item.lead?.displayName ?? null),
]

export async function projectCommand(args: string[], _ctx: JiraContext | undefined): Promise<string> {
  const sub = args[0] ?? 'list'
  if (sub !== 'list') return PROJECT_HELP

  const result = await acliJson(['jira', 'project', 'list', '--json'])
  const { items } = unwrapValues<any>(result)

  const blocks = [
    items.length ? renderList('projects', items, projectSchema) : 'projects: none',
    renderHelp(['Run `jira-axi issue list --project <KEY>` to list issues for a project']),
  ]
  return renderOutput(blocks)
}
