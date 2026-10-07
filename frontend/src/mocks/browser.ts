import { delay, http, passthrough } from 'msw'
import { setupWorker } from 'msw/browser'
import { API_BASE_URL } from '../api'
import { catalogHandlers } from './handlers/catalog'
import { checkoutHandlers } from './handlers/checkout'

/** Every mock response arrives this long after its request, like a real network. */
const RESPONSE_DELAY_MS = 300

/**
 * Workarounds for MSW 3.0.2. Its worker waits for the page to answer every
 * notice it sends, but the page never answers these, so the worker's events
 * never settle and Chrome stops it after its 5-minute event timeout. The
 * restarted worker has forgotten which pages it mocks for (an in-memory set
 * filled by MOCK_ACTIVATE), so every /api request would fall through to the
 * dev server and 404.
 */
const UNANSWERED_NOTICES: ReadonlySet<string> = new Set([
  'KEEPALIVE_RESPONSE',
  'MOCKING_ENABLED',
  'INTEGRITY_CHECK_RESPONSE',
])
/**
 * A worker restarted for any other reason has forgotten the page too, so the
 * first API request after the restart falls through to the network. Mocked
 * responses are always JSON (problems included); anything else from the API
 * is such a fall-through. Re-send MOCK_ACTIVATE (worker.start() can't run
 * twice; repeats are harmless) and retry once, after the worker has read it.
 */
const REACTIVATE_DELAY_MS = 50

function answerWorkerNotices(): void {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const type: unknown = event.data?.type
    if (typeof type === 'string' && UNANSWERED_NOTICES.has(type))
      event.ports[0]?.postMessage(null)
  })
}

function retryMissedMocks(): void {
  const apiBase = new URL(API_BASE_URL, window.location.origin).href
  const send = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const response = await send(input, init)
    const missed =
      response.url.startsWith(apiBase) &&
      !response.headers.get('content-type')?.includes('json')
    if (!missed) return response
    navigator.serviceWorker.controller?.postMessage('MOCK_ACTIVATE')
    await new Promise((resolve) => setTimeout(resolve, REACTIVATE_DELAY_MS))
    return send(input, init)
  }
}

/** Starts the MSW service worker that serves the API in the browser. */
export async function startMocking(): Promise<void> {
  const worker = setupWorker(
    // Answers nothing, so every API request waits here, then falls through.
    http.all(`${API_BASE_URL}/*`, () => delay(RESPONSE_DELAY_MS)),
    ...catalogHandlers(),
    ...checkoutHandlers(),
    // Page loads go to the dev server untouched (and unlogged). Unmatched API
    // calls still fall through to MSW's "unhandled request" warning.
    http.get('*', ({ request }) =>
      request.mode === 'navigate' ? passthrough() : undefined,
    ),
  )
  // Without service workers (insecure contexts) MSW intercepts fetch in the
  // page instead, and the workarounds don't apply. Notices are answered from
  // the start: the first ones arrive while worker.start() is still running.
  const usesServiceWorker = 'serviceWorker' in navigator
  if (usesServiceWorker) answerWorkerNotices()
  // quiet: no per-request console logs; the flow inspector shows journey activity.
  await worker.start({ quiet: true })
  if (usesServiceWorker) retryMissedMocks()
}
