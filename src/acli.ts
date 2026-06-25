import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mapCliError } from './errors.js'

const exec = promisify(execFile)
const MAX_BUF = 10 * 1024 * 1024

export async function acliJson(args: string[]): Promise<any> {
  try {
    const { stdout } = await exec('acli', args, { maxBuffer: MAX_BUF })
    return JSON.parse(stdout)
  } catch (err: any) {
    throw mapCliError(err.stderr ?? String(err), err.code ?? 1)
  }
}

export async function acliRun(args: string[]): Promise<string> {
  try {
    const { stdout } = await exec('acli', args, { maxBuffer: MAX_BUF })
    return stdout
  } catch (err: any) {
    throw mapCliError(err.stderr ?? String(err), err.code ?? 1)
  }
}

export function unwrapValues<T>(result: any): { items: T[]; total: number; isLast: boolean } {
  if (Array.isArray(result)) return { items: result, total: result.length, isLast: true }
  const items = result.values ?? result.comments ?? result.issues ?? []
  return { items, total: result.total ?? items.length, isLast: result.isLast ?? true }
}
