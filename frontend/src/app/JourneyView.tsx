import { useEffect, type ComponentType } from 'react'
import { stateValueToPath, type JourneyStateKey } from '../flows'
import { CartPage } from '../features/cart/CartPage'
import { HomePage } from '../features/catalog/HomePage'
import { CheckoutPage } from '../features/checkout/CheckoutPage'
import { ConfirmationPage } from '../features/confirmation/ConfirmationPage'
import {
  FlowInspector,
  FlowInspectorFailed,
} from '../features/flow-inspector/FlowInspector'
import { inspectorMounted } from '../features/flow-inspector/inspector-mount'
import { useJourneySelector } from '../features/journey/JourneyProvider'
import { RouteSync } from '../features/journey/RouteSync'
import { ProductPage } from '../features/product/ProductPage'
import { ErrorBoundary } from './AppErrorBoundary'

type PageKey = Exclude<JourneyStateKey, 'booting'>

/** Page and document title for each top-level journey state. `booting` renders nothing. */
const PAGES: Readonly<Record<PageKey, { Page: ComponentType; title: string }>> =
  {
    home: { Page: HomePage, title: 'Home' },
    product: { Page: ProductPage, title: 'Product' },
    cart: { Page: CartPage, title: 'Bag' },
    checkout: { Page: CheckoutPage, title: 'Checkout' },
    confirmation: { Page: ConfirmationPage, title: 'Receipt' },
  }

function pageFor(statePath: string) {
  const key = statePath.split('.')[0]
  return key !== undefined && key in PAGES ? PAGES[key as PageKey] : null
}

/** Renders the page for the journey's current state; the machine, not the router, decides. */
export function JourneyView() {
  const statePath = useJourneySelector((snapshot) =>
    stateValueToPath(snapshot.value),
  )
  const page = pageFor(statePath)
  const title = page ? `${page.title} · Goldberry` : 'Goldberry'

  // index.html owns the only <title>; this keeps it in step with the page.
  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <>
      <RouteSync />
      {page && <page.Page />}
      {/* A drawer failure leaves a slim band that says so, never takes the
          shop and its data-flow-* hooks with it; the flow log and
          window.goldberryFlow live in the journey actor and keep going. */}
      {inspectorMounted && (
        <ErrorBoundary
          label="Flow inspector failed"
          fallback={<FlowInspectorFailed />}
        >
          <FlowInspector />
        </ErrorBoundary>
      )}
    </>
  )
}
