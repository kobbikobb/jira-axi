import { encode } from '@toon-format/toon'
import { acliJson, unwrapValues } from '../acli.js'
import type { JiraContext } from '../context.js'
import { renderList, renderHelp, renderOutput, custom } from '../toon.js'
import { getSuggestions } from '../suggestions.js'

export const HOME_HELP = ''

const issueSchema = [
  custom('key', item => item.key),
  custom('title', item => item.fields?.summary ?? null),
  custom('type', item => item.fields?.issuetype?.name?.toLowerCase() ?? null),
  custom('status', item => item.fields?.status?.name?.toLowerCase() ?? null),
  custom('assignee', item => item.fields?.assignee?.displayName ?? 'unassigned'),
]

export async function homeCommand(_args: string[], ctx: JiraContext | undefined): Promise<string> {
  const projectJql = ctx?.project ? ` AND project = ${ctx.project}` : ''
  const jql = `assignee = currentUser() AND statusCategory != Done${projectJql} ORDER BY updated DESC`

  const issueResult = await acliJson(['jira', 'workitem', 'search', '--jql', jql, '--json', '--limit', '5']).catch(() => [])

  const { items: issues, total } = unwrapValues<any>(issueResult)

  const blocks: string[] = []

  if (ctx?.project) blocks.push(encode({ project: ctx.project }))

  blocks.push(issues.length
    ? renderList('issues', issues, issueSchema)
    : 'issues: 0 open')

  if (total > 5) blocks.push(`count: 5 of ${total} total`)

  blocks.push(renderHelp(getSuggestions({ domain: 'home', action: 'home', project: ctx?.project })))

  return renderOutput(blocks)
}
