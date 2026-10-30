import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="card-elevated p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-danger-muted rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>
            <h2 className="text-h3 mb-2">Что-то пошло не так</h2>
            <p className="text-text-secondary mb-6">
              {this.state.error?.message || 'Произошла непредвиденная ошибка. Попробуйте обновить страницу.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Попробовать снова
              </Button>
              <Button variant="secondary" onClick={this.handleHome} className="flex-1">
                <Home className="w-4 h-4 mr-2" />
                На главную
              </Button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left p-3 bg-background rounded-input text-xs text-text-muted">
                <summary className="cursor-pointer mb-2">Детали ошибки (dev)</summary>
                <pre className="whitespace-pre-wrap font-mono">{this.state.error.stack}</pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}