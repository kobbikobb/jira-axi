import { AxiError } from 'axi-sdk-js'

const patterns: Array<{
  pattern: RegExp
  code: string
  message: (m: RegExpMatchArray, raw: string) => string
  suggestions?: () => string[]
}> = [
  {
    pattern: /not authenticated|login required|unauthorized/i,
    code: 'AUTH_ERROR',
    message: () => 'Not authenticated with Jira',
    suggestions: () => ['Run `acli auth login` to authenticate'],
  },
  {
    pattern: /issue does not exist|not found|404/i,
    code: 'NOT_FOUND',
    message: (_, raw) => `Issue not found: ${firstLine(raw)}`,
  },
  {
    pattern: /permission|forbidden|403/i,
    code: 'PERMISSION_ERROR',
    message: () => 'Permission denied',
  },
  {
    pattern: /invalid.*jql|jql.*error/i,
    code: 'JQL_ERROR',
    message: (_, raw) => `Invalid JQL: ${firstLine(raw)}`,
    suggestions: () => ['Check JQL syntax at https://support.atlassian.com/jira-software-cloud/docs/use-advanced-search-with-jql/'],
  },
]

function firstLine(s: string): string {
  return s.split('\n').find(l => l.trim())?.trim() ?? s.trim()
}

export function mapCliError(stderr: string, exitCode: number): AxiError {
  for (const { pattern, code, message, suggestions } of patterns) {
    const match = stderr.match(pattern)
    if (match) return new AxiError(message(match, stderr), code, suggestions?.() ?? [])
  }
  return new AxiError(firstLine(stderr) || `acli exited with code ${exitCode}`, 'UNKNOWN')
}
