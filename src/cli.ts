import { runAxiCli, installSessionStartHooks } from 'axi-sdk-js'
import { resolveContext, stripProjectArgs, type JiraContext } from './context.js'
import { homeCommand, HOME_HELP } from './commands/home.js'
import { issueCommand, ISSUE_HELP } from './commands/issue.js'
import { sprintCommand, SPRINT_HELP } from './commands/sprint.js'
import { projectCommand, PROJECT_HELP } from './commands/project.js'

const COMMANDS = {
  issue: (args: string[], ctx: JiraContext | undefined) => issueCommand(args, ctx),
  sprint: (args: string[], ctx: JiraContext | undefined) => sprintCommand(args, ctx),
  project: (args: string[], ctx: JiraContext | undefined) => projectCommand(args, ctx),
  setup: async (_args: string[], _ctx: JiraContext | undefined) => {
    await installSessionStartHooks()
    return 'setup: done\nhelp[1]:\n  Restart your agent session to activate the jira-axi home view'
  },
}

const HELP: Record<string, string> = {
  issue: ISSUE_HELP,
  sprint: SPRINT_HELP,
  project: PROJECT_HELP,
  home: HOME_HELP,
}

const TOP_LEVEL_HELP = `
commands[4]:
  issue, sprint, project, setup
run \`jira-axi <command> --help\` for usage on any command
`.trim()

export function main(): void {
  runAxiCli<JiraContext>({
    description: 'Agent-ergonomic Jira CLI — search, view, and update issues with TOON output',
    version: '0.1.0',
    topLevelHelp: TOP_LEVEL_HELP,
    commands: COMMANDS,
    home: homeCommand,
    getCommandHelp: (cmd) => HELP[cmd] ?? null,
    resolveContext: ({ args }) => resolveContext({ command: undefined, args }) as JiraContext,
  })
}
