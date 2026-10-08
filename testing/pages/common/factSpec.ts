declare const READS: unique symbol

export type Fact<V> = FactNode & { readonly [READS]: V }

const fact = <V>(node: FactNode) => node as Fact<V>

const prop = <V>(node: PropNode) => node as Prop<V>

export const text = (selector: string) =>
  fact<string | null>({ kind: 'text', selector })

export const texts = (selector: string) =>
  fact<readonly string[]>({ kind: 'texts', selector })

export const int = (selector: string) =>
  fact<number | null>({ kind: 'int', selector })

export const cents = (selector: string, zeroWord = '') =>
  fact<number | null>({ kind: 'cents', selector, zeroWord })

export const attr = (selector: string, name: string, stripPrefix = '') =>
  fact<string | null>({ kind: 'attr', selector, name, stripPrefix })

export const exists = (selector: string) =>
  fact<boolean>({ kind: 'exists', selector })

export const control = (selector: string) =>
  fact<'enabled' | 'disabled' | null>({ kind: 'control', selector })

export const phrase = <P extends Readonly<Record<string, string>>>(
  selector: string,
  phrases: P,
) => fact<(keyof P & string) | null>({ kind: 'phrase', selector, phrases })

export const group = <F extends Fields>(selector: string, fields: F) =>
  fact<Read<F> | null>({ kind: 'group', selector, fields })

export const list = <F extends Fields>(selector: string, fields: F) =>
  fact<readonly Read<F>[]>({ kind: 'list', selector, fields })

export const path = () => fact<string>({ kind: 'path' })

export const backHistory = () =>
  fact<readonly string[]>({ kind: 'backHistory' })

export const pageLoad = () => fact<number>({ kind: 'pageLoad' })

export const storedList = <P extends Props>(key: string, props: P) =>
  fact<readonly Read<P>[] | null>({ kind: 'storedList', key, props })

export const textProp = (name: string) =>
  prop<string>({ kind: 'textProp', name })

export const intProp = (name: string) => prop<number>({ kind: 'intProp', name })

export const facts = <F extends Fields>(scope: string, fields: F) => ({
  scope,
  fields,
})

export type FactNode =
  | {
      readonly kind: 'text' | 'texts' | 'int' | 'exists' | 'control'
      readonly selector: string
    }
  | {
      readonly kind: 'cents'
      readonly selector: string
      readonly zeroWord: string
    }
  | {
      readonly kind: 'attr'
      readonly selector: string
      readonly name: string
      readonly stripPrefix: string
    }
  | {
      readonly kind: 'phrase'
      readonly selector: string
      readonly phrases: Readonly<Record<string, string>>
    }
  | {
      readonly kind: 'group' | 'list'
      readonly selector: string
      readonly fields: Fields
    }
  | { readonly kind: 'path' | 'backHistory' | 'pageLoad' }
  | { readonly kind: 'storedList'; readonly key: string; readonly props: Props }

type PropNode = {
  readonly kind: 'textProp' | 'intProp'
  readonly name: string
}

type Prop<V> = PropNode & { readonly [READS]: V }

export type Fields = Readonly<Record<string, FactNode>>
type Props = Readonly<Record<string, Prop<unknown>>>

export interface FactSpec {
  readonly scope: string
  readonly fields: Fields
}

type Read<F> = {
  readonly [K in keyof F]: F[K] extends { readonly [READS]: infer V }
    ? V
    : never
}

export type FactsOf<S extends FactSpec> = Read<S['fields']>
