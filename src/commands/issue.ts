import { encode } from '@toon-format/toon'
import { AxiError } from 'axi-sdk-js'
import { acliJson, unwrapValues } from '../acli.js'
import { takeFlag, takeBoolFlag, getPositional } from '../args.js'
import type { JiraContext } from '../context.js'
import { stripProjectArgs } from '../context.js'
import { custom, renderList, renderHelp, renderOutput, adfToText, truncate, relativeFromIso } from '../toon.js'
import { getSuggestions } from '../suggestions.js'

export const ISSUE_HELP = `
usage: jira-axi issue <subcommand> [flags]
subcommands[5]:
  list, view <KEY>, create, comment <KEY>, transition <KEY>
flags{list}:
  --project/-p <KEY>, --jql <query>, --assignee <user>, --status <status>, --limit <n> (default 20), --mine
flags{view}:
  --full (show complete description)
flags{create}:
  --project/-p <KEY> (required), --summary/-s <text> (required), --type/-t <type> (default Story), --description/-d <text>, --assignee/-a <email>
flags{comment}:
  --body/-b <text> (required)
flags{transition}:
  --status/-s <status> (required)
examples:
  jira-axi issue list --project TEAM --status "In Progress"
  jira-axi issue list --mine
  jira-axi issue view TEAM-123
  jira-axi issue create --project TEAM --summary "Fix login bug" --type Bug
  jira-axi issue comment TEAM-123 --body "Looking into this"
  jira-axi issue transition TEAM-123 --status "Done"
`.trim()

const listSchema = [
  custom('key', item => item.key),
  custom('title', item => item.fields?.summary ?? null),
  custom('type', item => item.fields?.issuetype?.name?.toLowerCase() ?? null),
  custom('status', item => item.fields?.status?.name?.toLowerCase() ?? null),
  custom('assignee', item => item.fields?.assignee?.displayName ?? 'unassigned'),
]


export async function issueCommand(args: string[], ctx: JiraContext | undefined): Promise<string> {
  const stripped = stripProjectArgs(args)
  const sub = stripped[0]
  const subArgs = stripped.slice(1)

  switch (sub) {
    case 'list': return issueList(subArgs, ctx)
    case 'view': return issueView(subArgs)
    case 'create': return issueCreate(subArgs, ctx)
    case 'comment': return issueComment(subArgs)
    case 'transition': return issueTransition(subArgs)
    default:
      return ISSUE_HELP
  }
}

async function issueList(args: string[], ctx: JiraContext | undefined): Promise<string> {
  const project = takeFlag(args, '--project') ?? takeFlag(args, '-p') ?? ctx?.project
  const rawJql = takeFlag(args, '--jql')
  const assignee = takeFlag(args, '--assignee')
  const status = takeFlag(args, '--status')
  const limit = takeFlag(args, '--limit') ?? '20'
  const mine = takeBoolFlag(args, '--mine')

  let jql = rawJql
  if (!jql) {
    const parts: string[] = []
    if (project) parts.push(`project = "${project}"`)
    if (mine) parts.push('assignee = currentUser()')
    if (assignee) parts.push(`assignee = "${assignee}"`)
    if (status) parts.push(`status = "${status}"`)
    parts.push('ORDER BY updated DESC')
    jql = parts.join(' AND ').replace(' AND ORDER', ' ORDER')
  }

  const result = await acliJson(['jira', 'workitem', 'search', '--jql', jql, '--json', '--limit', limit])
  const { items, total } = unwrapValues<any>(result)

  const blocks: string[] = []
  if (items.length) {
    blocks.push(renderList('issues', items, listSchema))
    if (total > items.length) blocks.push(`count: ${items.length} of ${total} total`)
    else blocks.push(`count: ${items.length}`)
  } else {
    blocks.push('issues: 0 found')
  }
  blocks.push(renderHelp(getSuggestions({ domain: 'issue', action: 'list', project, isEmpty: items.length === 0 })))
  return renderOutput(blocks)
}

async function issueView(args: string[]): Promise<string> {
  const key = getPositional(args, 0)
  if (!key) throw new AxiError('Missing issue key. Usage: jira-axi issue view <KEY>', 'VALIDATION_ERROR')
  const full = takeBoolFlag(args, '--full')

  const item = await acliJson(['jira', 'workitem', 'view', key, '--json', '--fields', 'key,issuetype,summary,status,assignee,description,updated,created,priority,labels,parent,reporter'])

  const f = item.fields ?? {}
  const rawDesc = adfToText(f.description)
  const desc = full ? rawDesc : truncate(rawDesc, 300)

  const detail: Record<string, any> = {
    key: item.key,
    title: f.summary,
    type: f.issuetype?.name?.toLowerCase(),
    status: f.status?.name?.toLowerCase(),
    priority: f.priority?.name?.toLowerCase(),
    assignee: f.assignee?.displayName ?? 'unassigned',
    reporter: f.reporter?.displayName ?? null,
    updated: relativeFromIso(f.updated),
    created: relativeFromIso(f.created),
  }
  if (desc) detail['description'] = desc

  const labels: string[] = Array.isArray(f.labels) ? f.labels : []
  if (labels.length) detail['labels'] = labels.join(',')

  const parent = f.parent?.key
  if (parent) detail['parent'] = parent

  const blocks = [
    encode({ issue: detail }),
    renderHelp(getSuggestions({ domain: 'issue', action: 'view', key })),
  ]
  return renderOutput(blocks)
}

async function issueCreate(args: string[], ctx: JiraContext | undefined): Promise<string> {
  const project = takeFlag(args, '--project') ?? takeFlag(args, '-p') ?? ctx?.project
  const summary = takeFlag(args, '--summary') ?? takeFlag(args, '-s')
  const type = takeFlag(args, '--type') ?? takeFlag(args, '-t') ?? 'Story'
  const description = takeFlag(args, '--description') ?? takeFlag(args, '-d')
  const assignee = takeFlag(args, '--assignee') ?? takeFlag(args, '-a')

  if (!project) throw new AxiError('--project/-p is required', 'VALIDATION_ERROR', ['Set JIRA_AXI_PROJECT env var or pass --project KEY'])
  if (!summary) throw new AxiError('--summary/-s is required', 'VALIDATION_ERROR')

  const acliArgs = ['jira', 'workitem', 'create', '--project', project, '--summary', summary, '--type', type, '--json']
  if (description) acliArgs.push('--description', description)
  if (assignee) acliArgs.push('--assignee', assignee)

  const result = await acliJson(acliArgs)
  const key = result.key ?? result.id

  const blocks = [
    encode({ created: { key, project, type: type.toLowerCase(), title: summary } }),
    renderHelp(getSuggestions({ domain: 'issue', action: 'create', key })),
  ]
  return renderOutput(blocks)
}

async function issueComment(args: string[]): Promise<string> {
  const key = getPositional(args, 0)
  if (!key) throw new AxiError('Missing issue key. Usage: jira-axi issue comment <KEY> --body "..."', 'VALIDATION_ERROR')
  const body = takeFlag(args, '--body') ?? takeFlag(args, '-b')
  if (!body) throw new AxiError('--body/-b is required', 'VALIDATION_ERROR')

  await acliJson(['jira', 'workitem', 'comment', 'create', '--key', key, '--body', body, '--json'])

  return renderOutput([
    encode({ commented: { key } }),
    renderHelp([`Run \`jira-axi issue view ${key}\` to see the updated issue`]),
  ])
}

async function issueTransition(args: string[]): Promise<string> {
  const key = getPositional(args, 0)
  if (!key) throw new AxiError('Missing issue key. Usage: jira-axi issue transition <KEY> --status "..."', 'VALIDATION_ERROR')
  const status = takeFlag(args, '--status') ?? takeFlag(args, '-s')
  if (!status) throw new AxiError('--status/-s is required', 'VALIDATION_ERROR')

  await acliJson(['jira', 'workitem', 'transition', '--key', key, '--status', status, '--json', '--yes'])

  return renderOutput([
    encode({ transitioned: { key, status } }),
    renderHelp([`Run \`jira-axi issue view ${key}\` to confirm the new status`]),
  ])
}
