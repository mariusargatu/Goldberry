import type { Snapshot, StateCheck } from '../../core/index.ts'
import type { ShownBagLine } from '../../pages/bag/bagPage.ts'
import type { Bill } from '../../pages/common/priceSummary/priceSummaryPage.ts'
import { dollars, items } from '../../pages/common/format.ts'
import type { FeaturedCard } from '../../pages/home/homeLocators.ts'
import type { ShopPages } from '../../pages/index.ts'
import type { ShownPiece } from '../../pages/product/productPage.ts'
import { onlyLeft, PRODUCT_COPY } from '../../pages/product/productLocators.ts'
import {
  CATALOG,
  LOW_STOCK,
  type Piece,
  pieceById,
  SHIPPING_LABEL,
} from '../model/fixtures.ts'
import { orderOf, pieceOf, samePath } from '../model/landing.ts'
import { type BagLine, type Prices, priceBag } from '../model/pricing.ts'
import type { ShopContext } from '../model/shop.types.ts'

const check =
  (run: (context: ShopContext) => Promise<void>): StateCheck =>
  (snapshot: Snapshot) =>
    run(snapshot.context as ShopContext)

const itemCount = (context: ShopContext): number =>
  context.bag.reduce((sum, line) => sum + line.quantity, 0)

const shownPiece = (piece: Piece): ShownPiece => ({
  name: piece.name,
  artist: piece.artist,
  price: dollars(piece.priceCents),
  editionSize: piece.editionSize,
})

const featuredCard = (
  piece: Piece,
  stock: ShopContext['stock'],
): FeaturedCard => ({
  ...shownPiece(piece),
  soldOut: (stock[piece.id] ?? 0) === 0,
})

function pieceOnPage(context: ShopContext) {
  const id = pieceOf(context.url)
  if (id === null) throw new Error('the model is not on a piece page')
  return { piece: pieceById(id), stock: context.stock[id] ?? 0 }
}

const stockLine = (stock: number): string =>
  stock > LOW_STOCK ? PRODUCT_COPY.inStock : onlyLeft(stock)

function shownLine(line: BagLine): ShownBagLine {
  const piece = pieceById(line.pieceId)
  return {
    name: piece.name,
    quantity: line.quantity,
    unit: dollars(piece.priceCents),
    total: dollars(piece.priceCents * line.quantity),
  }
}

const billFor = (prices: Prices): Bill => ({
  ...prices,
  shippingLabel: SHIPPING_LABEL,
})

function orderShown(context: ShopContext) {
  const index = orderOf(context.url)
  const order =
    index === null
      ? context.orders.find((placed) => placed.path === context.url)
      : context.orders[index]
  if (order === undefined)
    throw new Error(`the model placed no order at ${context.url}`)
  return order
}

export function shopChecks(
  pages: ShopPages,
): Readonly<Record<string, StateCheck>> {
  async function everyPage(context: ShopContext): Promise<void> {
    await pages.header.expectPath(
      (path) => samePath(context.url, path),
      `the path is ${context.url}`,
    )
    const count = itemCount(context)
    await pages.header.expectBagCount(
      count,
      `the header counts ${items(count)}`,
    )
  }

  return {
    home: check(everyPage),

    'home.ready': check(async ({ stock }) => {
      for (const piece of CATALOG)
        await pages.home.expectFeatured(piece.id, featuredCard(piece, stock))
    }),

    product: check(async (context) => {
      await everyPage(context)
      await pages.product.expectPiece(shownPiece(pieceOnPage(context).piece))
    }),

    'product.available': check(async (context) => {
      await pages.product.expectStock(stockLine(pieceOnPage(context).stock))
      await pages.product.expectAddable()
    }),

    'product.soldOut': () => pages.product.expectSoldOut(),

    'product.inBag': check(({ justAdded }) =>
      pages.product.expectInBag(justAdded),
    ),

    bag: check(async (context) => {
      await everyPage(context)
      await pages.bag.expectBagHeading()
    }),

    'bag.empty': () => pages.bag.expectEmpty(),

    'bag.filled': check(async (context) => {
      for (const line of context.bag)
        await pages.bag.expectLine(shownLine(line))
      await pages.bag.expectSubtotal(
        itemCount(context),
        dollars(priceBag(context.bag).subtotal),
      )
      await pages.bag.expectCheckOut()
    }),

    checkout: check(async (context) => {
      await everyPage(context)
      await pages.shipping.expectCheckoutHeading('the checkout page')
    }),

    'checkout.shipping': () => pages.shipping.expectEmptyForm(),

    'checkout.payment': check(async (context) => {
      const prices = priceBag(context.bag)
      await pages.priceSummary.expectBill(billFor(prices))
      await pages.payment.expectPayButton(dollars(prices.total))
    }),

    receipt: check(everyPage),

    'receipt.ready': check(async (context) => {
      await pages.receipt.expectConfirmed()
      await pages.receipt.expectShipsWith(SHIPPING_LABEL)
      await pages.priceSummary.expectBill(billFor(orderShown(context).prices))
      await pages.receipt.expectContinueShopping()
    }),
  }
}
