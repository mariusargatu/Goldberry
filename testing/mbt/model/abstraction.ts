import { type CoverageModel, toStateString } from '../../core/index.ts'
import type { ShopContext } from './shop.types.ts'

export const shopAbstraction: CoverageModel = {
  abstractState: (snapshot) => {
    const context = snapshot.context as ShopContext
    const state = toStateString(snapshot.value)
    const pieces = context.bag.map((line) => line.pieceId).sort()
    const soldOut = Object.keys(context.stock)
      .filter((id) => context.stock[id] === 0)
      .sort()
    return [
      state,
      pieces.length > 0 ? `bag ${pieces.join(' ')}` : 'no bag',
      soldOut.length > 0 ? `sold out ${soldOut.join(' ')}` : '',
      context.back.length > 0 ? 'back' : 'no back',
    ]
      .filter((part) => part !== '')
      .join(' | ')
  },
}
