import type { Page } from '@playwright/test'
import { BagPage } from './bag/bagPage.ts'
import { HeaderPage } from './common/header/headerPage.ts'
import { NavigationPage } from './common/navigation/navigationPage.ts'
import { PriceSummaryPage } from './common/priceSummary/priceSummaryPage.ts'
import { HomePage } from './home/homePage.ts'
import { PaymentPage } from './payment/paymentPage.ts'
import { ProductPage } from './product/productPage.ts'
import { ReceiptPage } from './receipt/receiptPage.ts'
import { ShippingPage } from './shipping/shippingPage.ts'

/** Every page object of the shop, on one Playwright page. */
export function shopPages(page: Page) {
  return {
    header: new HeaderPage(page),
    navigation: new NavigationPage(page),
    priceSummary: new PriceSummaryPage(page),
    home: new HomePage(page),
    product: new ProductPage(page),
    bag: new BagPage(page),
    shipping: new ShippingPage(page),
    payment: new PaymentPage(page),
    receipt: new ReceiptPage(page),
  } as const
}

export type ShopPages = ReturnType<typeof shopPages>
