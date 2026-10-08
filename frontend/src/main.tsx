import './bugs'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import { App } from './app/App'

async function enableMocking(): Promise<void> {
  // Read here rather than through a shared constant, so Vite replaces it with
  // a literal and can leave the mock server out of live builds.
  if (import.meta.env.VITE_API_MODE === 'live') return
  const { startMocking } = await import('./mocks/browser')
  await startMocking()
}

function rootElement(): HTMLElement {
  const element = document.getElementById('root')
  if (!element) throw new Error('Root element #root is missing from index.html')
  return element
}

function render(): void {
  createRoot(rootElement()).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Without the mocks there is no API at all, and every call would fail in ways
// that look like real journey branches (not found, failed), so stop here.
// Plain HTTP doesn't land here (MSW then intercepts fetch in the page); this
// is a worker that failed to register: blocked by the browser, or a missing
// mockServiceWorker.js.
function showMockFailure(error: unknown): void {
  console.error('The mock API could not start.', error)
  const message = document.createElement('p')
  message.className = 'm-8 max-w-prose'
  message.textContent =
    'The demo API could not start: the browser did not let its service worker (mockServiceWorker.js) register. Allow service workers for this site and reload.'
  rootElement().replaceChildren(message)
}

enableMocking().then(render, showMockFailure)
