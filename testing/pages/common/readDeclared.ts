// Sent to the page as source: everything it uses is defined inside it.
import type { FactNode, FactSpec } from './factSpec.ts'

type NodeOf<K extends FactNode['kind']> = FactNode & { readonly kind: K }
type Scope = ParentNode | null

export function readDeclared(
  window: Window,
  ...specs: readonly FactSpec[]
): Record<string, unknown> {
  const first = (scope: Scope, selector: string) =>
    scope?.querySelector(selector) ?? null

  const all = (scope: Scope, selector: string) => [
    ...(scope?.querySelectorAll(selector) ?? []),
  ]

  const textOf = (element: Element | null) =>
    element === null ? null : (element.textContent ?? '').trim()

  const wholeNumber = (text: string | null) =>
    text !== null && /^-?\d+$/.test(text) ? Number(text) : null

  function centsIn(text: string | null, zeroWord: string): number | null {
    if (zeroWord !== '' && text === zeroWord) return 0
    const [, whole, fraction] = /^\$([\d,]+)\.(\d{2})$/.exec(text ?? '') ?? []
    if (whole === undefined || fraction === undefined) return null
    return Number(whole.replaceAll(',', '')) * 100 + Number(fraction)
  }

  const withoutPrefix = (raw: string | null, prefix: string) =>
    raw?.startsWith(prefix) ? raw.slice(prefix.length) : raw

  const controlState = (element: Element | null) =>
    element === null
      ? null
      : element.matches(':disabled')
        ? 'disabled'
        : 'enabled'

  const phraseIn = (text: string, phrases: Readonly<Record<string, string>>) =>
    Object.entries(phrases).find(([, words]) => text.includes(words))?.[0] ??
    null

  function backHistory(): string[] {
    const navigation = (
      window as {
        navigation?: {
          entries(): { url: string | null }[]
          currentEntry: { index: number } | null
        }
      }
    ).navigation
    const behind = (navigation?.entries() ?? []).slice(
      0,
      navigation?.currentEntry?.index ?? 0,
    )
    return behind.flatMap(({ url }) => {
      if (url === null) return []
      const { origin, pathname, search } = new URL(url)
      return origin === window.location.origin ? [pathname + search] : []
    })
  }

  function storedList(
    key: string,
    props: Readonly<Record<string, { kind: string; name: string }>>,
  ): Record<string, unknown>[] | null {
    let stored: unknown
    try {
      stored = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    } catch {
      return null
    }
    if (!Array.isArray(stored)) return null
    const fits = (kind: string, raw: unknown) =>
      kind === 'intProp' ? Number.isInteger(raw) : typeof raw === 'string'
    const entries = stored.map((item: Record<string, unknown> | null) =>
      Object.fromEntries(
        Object.entries(props).map(([name, { kind, name: property }]) => {
          const raw = item?.[property]
          return [name, fits(kind, raw) ? raw : undefined]
        }),
      ),
    )
    const wellFormed = entries.every((entry) =>
      Object.values(entry).every((value) => value !== undefined),
    )
    return wellFormed ? entries : null
  }

  const readers: {
    [K in FactNode['kind']]: (node: NodeOf<K>, scope: Scope) => unknown
  } = {
    text: (node, scope) => textOf(first(scope, node.selector)),
    texts: (node, scope) => all(scope, node.selector).map(textOf),
    int: (node, scope) => wholeNumber(textOf(first(scope, node.selector))),
    cents: (node, scope) =>
      centsIn(textOf(first(scope, node.selector)), node.zeroWord),
    attr: (node, scope) =>
      withoutPrefix(
        first(scope, node.selector)?.getAttribute(node.name) ?? null,
        node.stripPrefix,
      ),
    exists: (node, scope) => first(scope, node.selector) !== null,
    control: (node, scope) => controlState(first(scope, node.selector)),
    phrase: (node, scope) =>
      phraseIn(first(scope, node.selector)?.textContent ?? '', node.phrases),
    group: (node, scope) => {
      const found = first(scope, node.selector)
      return found === null ? null : readFields(node.fields, found)
    },
    list: (node, scope) =>
      all(scope, node.selector).map((item) => readFields(node.fields, item)),
    path: () => window.location.pathname + window.location.search,
    backHistory,
    pageLoad: () => window.performance.timeOrigin,
    storedList: (node) => storedList(node.key, node.props),
  }

  function readFields(fields: FactSpec['fields'], scope: Scope) {
    return Object.fromEntries(
      Object.entries(fields).map(([name, node]) => {
        const read = readers[node.kind] as (
          node: FactNode,
          scope: Scope,
        ) => unknown
        return [name, read(node, scope)]
      }),
    )
  }

  return Object.assign(
    {},
    ...specs.map((spec) =>
      readFields(spec.fields, window.document.querySelector(spec.scope)),
    ),
  )
}
