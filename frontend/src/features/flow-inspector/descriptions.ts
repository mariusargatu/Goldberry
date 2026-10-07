import { BY_ID } from './graph-model'

export type TextBlock = { kind: 'paragraph' | 'lead' | 'bullet'; text: string }

export function descriptionOf(id: string): readonly TextBlock[] | null {
  const rows = (BY_ID.get(id)?.description ?? '')
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)
  if (rows.length === 0) return null
  return rows.map((row, index) =>
    row.startsWith('- ')
      ? { kind: 'bullet', text: row.slice(2) }
      : {
          kind:
            row.endsWith(':') && rows[index + 1]?.startsWith('- ')
              ? 'lead'
              : 'paragraph',
          text: row,
        },
  )
}
