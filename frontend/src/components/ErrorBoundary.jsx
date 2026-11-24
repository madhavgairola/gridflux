import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GridFlux ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#1f1616] border border-red-500/40 rounded-lg p-6 max-w-2xl mx-auto my-12 text-zinc-200">
          <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm mb-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Component Rendering Error</span>
          </div>
          <p className="text-xs text-zinc-300 font-mono mb-4 bg-[#140e0e] border border-red-900/30 p-3 rounded overflow-x-auto">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900/50 hover:bg-red-900/80 text-red-200 border border-red-700/50 text-xs font-mono transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload Application</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
