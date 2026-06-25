export function getFlag(args: string[], name: string): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && i + 1 < args.length) return args[i + 1]
    if (args[i]?.startsWith(`${name}=`)) return args[i]!.slice(name.length + 1)
  }
  return undefined
}

export function takeFlag(args: string[], flag: string): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) {
      return args.splice(i, 2)[1]
    }
    if (args[i]?.startsWith(`${flag}=`)) {
      return args.splice(i, 1)[0]!.slice(flag.length + 1)
    }
  }
  return undefined
}

export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag)
}

export function takeBoolFlag(args: string[], flag: string): boolean {
  const idx = args.indexOf(flag)
  if (idx >= 0) { args.splice(idx, 1); return true }
  return false
}

export function getPositional(args: string[], startIndex = 0): string | undefined {
  let count = 0
  for (const a of args) {
    if (!a.startsWith('-')) {
      if (count === startIndex) return a
      count++
    }
  }
  return undefined
}
