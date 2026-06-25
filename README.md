# jira-axi

AXI-compliant Jira CLI — token-efficient [TOON](https://axi.md/) output, contextual suggestions, idempotent mutations. Built for AI agents.

Wraps [`acli`](https://developer.atlassian.com/cloud/acli/) (Atlassian CLI). Part of the [AXI ecosystem](https://axi.md/).

## Why

Standard `acli jira` output is verbose JSON. Agents burn hundreds of tokens just parsing it. `jira-axi` returns compact TOON, pre-computed counts, and actionable `help[]` suggestions — so agents spend tokens on work, not on parsing.

## Prerequisites

- [acli](https://developer.atlassian.com/cloud/acli/) installed and authenticated (`acli auth login`)
- Node.js 18+

## Install

```sh
npm install -g jira-axi
```

## Usage

```sh
# Dashboard — your open issues
jira-axi

# Scope to a project
jira-axi --project TEAM
# or: export JIRA_AXI_PROJECT=TEAM

# Issues
jira-axi issue list --project TEAM
jira-axi issue list --mine
jira-axi issue list --jql "sprint in openSprints() AND assignee = currentUser()"
jira-axi issue view TEAM-123
jira-axi issue view TEAM-123 --full
jira-axi issue create --project TEAM --summary "Fix login bug" --type Bug
jira-axi issue comment TEAM-123 --body "Investigated, root cause is X"
jira-axi issue transition TEAM-123 --status "In Progress"

# Sprints
jira-axi sprint list --board 42
jira-axi sprint issues --sprint 10 --board 42

# Projects
jira-axi project list
```

## Output format

TOON — token-optimized notation. Example:

```
issues[3]{key,title,type,status,assignee}:
  TEAM-42,Fix login bug,bug,in progress,Alice
  TEAM-43,Add dark mode,story,todo,Bob
  TEAM-44,Update docs,task,done,Alice
count: 3
help[2]:
  Run `jira-axi issue view <KEY>` to see full issue details
  Add --jql "..." to filter with custom JQL
```

~40% fewer tokens than JSON for the same data.

## Configuration

| Method | Example |
|---|---|
| Flag | `jira-axi issue list --project TEAM` |
| Env var | `export JIRA_AXI_PROJECT=TEAM` |

## Agent integration

Wire `jira-axi` into your Claude Code session:

```sh
jira-axi setup
```

This installs a `SessionStart` hook so every agent session opens with your Jira dashboard.

Or add it manually to `~/.claude/CLAUDE.md`:

```
Use `jira-axi` for all Jira operations. Set JIRA_AXI_PROJECT=<KEY> to scope to a project.
```

## License

MIT
