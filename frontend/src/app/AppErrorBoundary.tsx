import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, MessagePanel, PageContainer } from '../design-system'

type ErrorBoundaryProps = {
  /** Logged with the error, to tell boundaries apart. */
  label: string
  fallback: ReactNode
  children: ReactNode
}

/** Shows `fallback` instead of a subtree that threw while rendering. */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(this.props.label, error, info.componentStack)
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * Last-resort fallback for rendering errors. Request failures never reach it:
 * the machines send the visitor home or back to the step they were on.
 */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      label="Unhandled rendering error"
      fallback={
        <PageContainer className="py-space-xl">
          <MessagePanel
            role="alert"
            tone="error"
            icon="error"
            headingLevel={1}
            title="Something went wrong"
            description="The page hit an unexpected error. Reloading usually fixes it."
            action={
              <Button
                variant="secondary"
                icon="refresh"
                onClick={() => window.location.reload()}
              >
                Reload
              </Button>
            }
          />
        </PageContainer>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
