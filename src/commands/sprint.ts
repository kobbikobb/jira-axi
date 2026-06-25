import { encode } from '@toon-format/toon'
import { AxiError } from 'axi-sdk-js'
import { acliJson, unwrapValues } from '../acli.js'
import { takeFlag } from '../args.js'
import type { JiraContext } from '../context.js'
import { custom, renderList, renderHelp, renderOutput } from '../toon.js'
import { getSuggestions } from '../suggestions.js'

export const SPRINT_HELP = `
usage: jira-axi sprint <subcommand> [flags]
subcommands[2]:
  list, issues
flags{list}:
  --board <ID> (required)
flags{issues}:
  --sprint <ID> (required), --board <ID> (required)
examples:
  jira-axi sprint list --board 42
  jira-axi sprint issues --sprint 10 --board 42
`.trim()

const sprintSchema = [
  custom('id', item => item.id),
  custom('name', item => item.name),
  custom('state', item => item.state?.toLowerCase()),
  custom('start', item => item.startDate?.slice(0, 10) ?? null),
  custom('end', item => item.endDate?.slice(0, 10) ?? null),
  custom('goal', item => item.goal ?? null),
]

const issueSchema = [
  custom('key', item => item.key),
  custom('title', item => item.fields?.summary ?? null),
  custom('type', item => item.fields?.issuetype?.name?.toLowerCase() ?? null),
  custom('status', item => item.fields?.status?.name?.toLowerCase() ?? null),
  custom('assignee', item => item.fields?.assignee?.displayName ?? 'unassigned'),
]

export async function sprintCommand(args: string[], _ctx: JiraContext | undefined): Promise<string> {
  const sub = args[0]
  const subArgs = args.slice(1)

  switch (sub) {
    case 'list': return sprintList(subArgs)
    case 'issues': return sprintIssues(subArgs)
    default: return SPRINT_HELP
  }
}

async function sprintList(args: string[]): Promise<string> {
  const board = takeFlag(args, '--board')
  if (!board) throw new AxiError('--board <ID> is required', 'VALIDATION_ERROR', ['Run `jira-axi project list` to find board IDs'])

  const result = await acliJson(['jira', 'board', 'list-sprints', '--id', board, '--json'])
  const { items } = unwrapValues<any>(result)

  const blocks = [
    items.length ? renderList('sprints', items, sprintSchema) : 'sprints: none',
    renderHelp(getSuggestions({ domain: 'sprint', action: 'list' })),
  ]
  return renderOutput(blocks)
}

async function sprintIssues(args: string[]): Promise<string> {
  const sprint = takeFlag(args, '--sprint')
  const board = takeFlag(args, '--board')
  if (!sprint) throw new AxiError('--sprint <ID> is required', 'VALIDATION_ERROR')
  if (!board) throw new AxiError('--board <ID> is required', 'VALIDATION_ERROR')

  const result = await acliJson(['jira', 'sprint', 'list-workitems', '--sprint', sprint, '--board', board, '--json'])
  const { items, total } = unwrapValues<any>(result)

  const blocks = [
    encode({ sprint: { id: Number(sprint) } }),
    items.length ? renderList('issues', items, issueSchema) : 'issues: none',
    `count: ${items.length}${total > items.length ? ` of ${total} total` : ''}`,
  ]
  return renderOutput(blocks)
}
