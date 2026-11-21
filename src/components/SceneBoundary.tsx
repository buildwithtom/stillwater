import { Component } from 'react'
import type { ReactNode } from 'react'

export class SceneBoundary extends Component<{
  fallback: ReactNode
  onError?: () => void
  children: ReactNode
}, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError?.()
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
