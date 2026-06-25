interface SuggestionCtx {
  domain: string
  action: string
  key?: string
  project?: string
  isEmpty?: boolean
}

const table: Array<{
  match: (c: SuggestionCtx) => boolean
  lines: (c: SuggestionCtx) => string[]
}> = [
  {
    match: c => c.domain === 'home',
    lines: c => [
      `Run \`jira-axi issue list${c.project ? ` --project ${c.project}` : ''}\` for full issue list`,
      `Run \`jira-axi issue create --project <KEY> --summary "..." --type Story\` to create an issue`,
    ],
  },
  {
    match: c => c.domain === 'issue' && c.action === 'list' && !c.isEmpty,
    lines: () => [
      'Run `jira-axi issue view <KEY>` to see full issue details',
      'Add --jql "..." to filter with custom JQL',
    ],
  },
  {
    match: c => c.domain === 'issue' && c.action === 'list' && !!c.isEmpty,
    lines: c => [
      `No issues found. Try \`jira-axi issue list${c.project ? ` --project ${c.project}` : ''} --jql "..."\` with broader criteria`,
    ],
  },
  {
    match: c => c.domain === 'issue' && c.action === 'view',
    lines: c => [
      `Run \`jira-axi issue comment ${c.key} --body "..."\` to add a comment`,
      `Run \`jira-axi issue transition ${c.key} --status "In Progress"\` to transition`,
    ],
  },
  {
    match: c => c.domain === 'issue' && c.action === 'create',
    lines: c => [
      `Run \`jira-axi issue view ${c.key}\` to see the created issue`,
      `Run \`jira-axi issue transition ${c.key} --status "In Progress"\` to start work`,
    ],
  },
  {
    match: c => c.domain === 'sprint' && c.action === 'list',
    lines: () => [
      'Run `jira-axi sprint issues --sprint <ID> --board <ID>` to see sprint work items',
    ],
  },
]

export function getSuggestions(ctx: SuggestionCtx): string[] {
  for (const entry of table) {
    if (entry.match(ctx)) return entry.lines(ctx)
  }
  return []
}
