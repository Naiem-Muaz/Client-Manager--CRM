import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Route/section-level error boundary. A render error inside `children` shows a
 * contained fallback (with a retry) instead of taking down the whole app — so a
 * bug in one page can't white-screen the entire CRM.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error(`[ErrorBoundary${this.props.label ? ` · ${this.props.label}` : ''}]`, error, info);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8">
          <div className="max-w-md mx-auto bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center">
            <AlertTriangle className="mx-auto mb-3 text-red-500" size={28} />
            <h2 className="font-bold text-slate-900">Couldn't load {this.props.label ?? 'this page'}</h2>
            <p className="text-sm text-slate-500 mt-1">Something went wrong rendering this view. The rest of the app is unaffected.</p>
            <button onClick={this.reset} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
