import { BrowserRouter } from 'react-router'
import { JourneyProvider } from '../features/journey/JourneyProvider'
import { AppErrorBoundary } from './AppErrorBoundary'
import { AppLayout } from './AppLayout'
import { JourneyView } from './JourneyView'

/** Every URL belongs to the shopping journey; the machine picks the page. */
export function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <JourneyProvider>
          <AppLayout>
            <JourneyView />
          </AppLayout>
        </JourneyProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  )
}
