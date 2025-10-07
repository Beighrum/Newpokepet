import React, { Component, ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Trophy } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackMessage?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

class PostBattleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Post-battle component error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Post-Battle Display Issue
                </h3>
                <p className="text-yellow-700 mb-4">
                  {this.props.fallbackMessage || 
                   "There was an issue displaying your battle rewards, but your victory has been recorded."}
                </p>
                
                <div className="bg-yellow-100 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <Trophy className="w-4 h-4" />
                    <span className="font-medium">Your Progress is Safe</span>
                  </div>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                    <li>✅ Battle victory has been recorded</li>
                    <li>✅ Experience and gems have been awarded</li>
                    <li>✅ Pet progression has been saved</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={this.handleReset}
                    size="sm"
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  >
                    Refresh Page
                  </Button>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4">
                    <summary className="text-sm text-yellow-600 cursor-pointer">
                      Error Details (Development)
                    </summary>
                    <pre className="text-xs text-yellow-500 mt-2 overflow-auto bg-yellow-100 p-2 rounded">
                      {this.state.error.message}
                      {this.state.errorInfo?.componentStack && (
                        <>
                          {'\n\nComponent Stack:'}
                          {this.state.errorInfo.componentStack}
                        </>
                      )}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export default PostBattleErrorBoundary