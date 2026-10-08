import {
  backHistory,
  facts,
  type FactsOf,
  intProp,
  pageLoad,
  path,
  storedList,
  textProp,
} from '../factSpec.ts'
import { BROWSER } from './browserLocators.ts'

export const BROWSER_FACTS = facts(':root', {
  url: path(),
  storedBag: storedList(BROWSER.cartKey, {
    pieceId: textProp('productId'),
    quantity: intProp('quantity'),
  }),
  history: backHistory(),
  document: pageLoad(),
})

export type BrowserFacts = FactsOf<typeof BROWSER_FACTS>
