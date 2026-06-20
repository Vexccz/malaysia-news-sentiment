import React from 'react';

/**
 * ErrorBoundary — catches unhandled React errors and shows a friendly fallback UI
 * instead of a blank white screen.
 * 
 * Usage: Wrap around any component tree in App.jsx
 *   <ErrorBoundary>
 *     <Dashboard />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback UI via props
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          retry: this.handleRetry,
          reload: this.handleReload,
        });
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '40px 20px',
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: 'var(--text-900, #e2e8f0)',
        }}>
          <div style={{
            background: 'var(--card-bg, rgba(30, 41, 59, 0.8))',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            borderRadius: '16px',
            padding: '48px 40px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: 'var(--shadow-lg, 0 25px 50px rgba(0,0,0,0.25))',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '8px',
              color: 'var(--text-900, #f1f5f9)',
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-400, #94a3b8)',
              marginBottom: '24px',
              lineHeight: 1.6,
            }}>
              {this.state.error?.message || 'An unexpected error occurred. This could be a temporary issue.'}
            </p>
            {this.state.errorInfo?.componentStack && (
              <details style={{ marginBottom: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-400, #94a3b8)', fontFamily: 'monospace', maxHeight: '120px', overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '4px' }}>Stack trace</summary>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent, #6366f1)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseOver={e => e.target.style.opacity = '0.85'}
                onMouseOut={e => e.target.style.opacity = '1'}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  background: 'transparent',
                  color: 'var(--text-600, #cbd5e1)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseOver={e => e.target.style.opacity = '0.85'}
                onMouseOut={e => e.target.style.opacity = '1'}
              >
                Reload Page
              </button>
            </div>

            {/* Show error details in dev mode */}
            {import.meta.env.DEV && this.state.error && (
              <details style={{
                marginTop: '24px',
                textAlign: 'left',
                fontSize: '11px',
                color: 'var(--text-300, #64748b)',
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                  Error Details (dev only)
                </summary>
                <pre style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '12px',
                  borderRadius: '8px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  fontSize: '10px',
                  lineHeight: 1.5,
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline ErrorBoundary for individual components (charts, cards, etc.)
 * Shows a minimal error state instead of crashing the whole page.
 */
export const InlineErrorBoundary = ({ children, name }) => (
  <ErrorBoundary
    fallback={({ retry }) => (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-400, #94a3b8)',
        fontSize: '13px',
        background: 'var(--card-bg, rgba(30, 41, 59, 0.5))',
        borderRadius: '12px',
        border: '1px solid var(--border, rgba(255,255,255,0.06))',
      }}>
        <div style={{ marginBottom: '8px' }}>⚠️ {name || 'Component'} failed to load</div>
        <button
          onClick={retry}
          style={{
            padding: '6px 16px',
            borderRadius: '6px',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            background: 'transparent',
            color: 'var(--text-600, #cbd5e1)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
