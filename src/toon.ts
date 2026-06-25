import { encode } from '@toon-format/toon'

export type FieldDef =
  | { type: 'field'; key: string; as?: string }
  | { type: 'pluck'; key: string; subkey: string; as?: string }
  | { type: 'joinArray'; key: string; subkey: string; as?: string; empty?: string }
  | { type: 'relativeTime'; key: string; as?: string }
  | { type: 'lower'; key: string; as?: string }
  | { type: 'mapEnum'; key: string; map: Record<string, string>; fallback?: string; as?: string }
  | { type: 'custom'; as: string; fn: (item: any) => any }

export function field(key: string, as?: string): FieldDef { return { type: 'field', key, as } }
export function pluck(key: string, subkey: string, as?: string): FieldDef { return { type: 'pluck', key, subkey, as } }
export function joinArray(key: string, subkey: string, as?: string, empty = 'none'): FieldDef { return { type: 'joinArray', key, subkey, as, empty } }
export function relativeTime(key: string, as?: string): FieldDef { return { type: 'relativeTime', key, as } }
export function lower(key: string, as?: string): FieldDef { return { type: 'lower', key, as } }
export function mapEnum(key: string, map: Record<string, string>, fallback?: string, as?: string): FieldDef { return { type: 'mapEnum', key, map, fallback, as } }
export function custom(as: string, fn: (item: any) => any): FieldDef { return { type: 'custom', as, fn } }

export function extract(item: Record<string, any>, schema: FieldDef[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const def of schema) {
    const key = def.as ?? ('key' in def ? def.key : (def as any).as)
    switch (def.type) {
      case 'field': result[key] = item[def.key] ?? null; break
      case 'pluck': result[key] = item[def.key]?.[def.subkey] ?? null; break
      case 'joinArray': {
        const arr = item[def.key]
        result[key] = Array.isArray(arr) && arr.length
          ? arr.map((x: any) => typeof x === 'string' ? x : x[def.subkey]).join(',')
          : (def.empty ?? 'none')
        break
      }
      case 'relativeTime': result[key] = relativeFromIso(item[def.key]); break
      case 'lower': result[key] = typeof item[def.key] === 'string' ? item[def.key].toLowerCase() : item[def.key]; break
      case 'mapEnum': result[key] = def.map[item[def.key]] ?? def.fallback ?? item[def.key]; break
      case 'custom': result[key] = def.fn(item); break
    }
  }
  return result
}

export function renderList(label: string, items: Record<string, any>[], schema: FieldDef[]): string {
  return encode({ [label]: items.map(item => extract(item, schema)) })
}

export function renderDetail(label: string, item: Record<string, any>, schema: FieldDef[]): string {
  return encode({ [label]: extract(item, schema) })
}

export function renderHelp(lines: string[]): string {
  if (!lines.length) return ''
  return `help[${lines.length}]:\n${lines.map(l => `  ${l}`).join('\n')}`
}

export function renderOutput(blocks: string[]): string {
  return blocks.filter(Boolean).join('\n')
}

export function relativeFromIso(iso: string | null | undefined): string {
  if (!iso) return 'unknown'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function adfToText(node: any): string {
  if (!node) return ''
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return '\n'
  if (Array.isArray(node.content)) return node.content.map(adfToText).join('')
  return ''
}

export function truncate(text: string, max = 200): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}... (${text.length} chars total — use --full to see complete)`
}
