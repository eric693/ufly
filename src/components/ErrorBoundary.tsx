import { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || '未知錯誤' }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <AlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
            <h1 className="text-white text-xl font-bold mb-2">頁面發生錯誤</h1>
            <p className="text-gray-400 text-sm mb-6">{this.state.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload() }}
              className="px-5 py-2.5 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              重新整理
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
