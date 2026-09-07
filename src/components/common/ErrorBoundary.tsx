import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Tanoah ErrorBoundary caught an unhandled exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const text = `Error: ${error?.message || 'Unknown'}\n\nStack:\n${error?.stack || ''}\n\nComponent Stack:\n${errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails, copied } = this.state;

      return (
        <div className="min-h-screen bg-[#FAFAFA] font-poppins flex flex-col justify-between text-black px-4 py-12 sm:py-20">
          <div className="max-w-xl mx-auto w-full text-center space-y-6">
            {/* Tanoah Brand Logo */}
            <div className="flex justify-center mb-6">
              <a href="/">
                <img
                  src="/Assets/brand/logo-blue.png"
                  alt="TANOAH"
                  className="h-10 w-auto hover:opacity-80 transition-opacity"
                />
              </a>
            </div>

            {/* Error Status Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/60 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-widest uppercase text-amber-900">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>TANOAH SERVICE NOTICE</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-wondra text-3xl sm:text-4xl text-black tracking-tight">
              AN UNEXPECTED DISTURBANCE OCCURRED
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-[#666666] leading-relaxed max-w-md mx-auto">
              We sincerely apologize for this interruption. Our customer support team has been alerted. You may reload this page or return to the main store.
            </p>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={this.handleReload}
                icon={<RefreshCw className="w-4 h-4" />}
                className="w-full sm:w-auto text-xs uppercase tracking-wider px-6 py-3.5 shadow-sm"
              >
                Reload This Page
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={this.handleGoHome}
                icon={<Home className="w-4 h-4" />}
                className="w-full sm:w-auto text-xs uppercase tracking-wider px-6 py-3.5 border border-[#E7E7E7] bg-white hover:bg-neutral-50"
              >
                Return to Home Salon
              </Button>
            </div>

            {/* Direct Support Contact */}
            <div className="pt-2">
              <a
                href={`https://wa.me/918714141849?text=${encodeURIComponent(
                  `Hello TANOAH Support, I encountered a technical issue on: ${window.location.href}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-[#25D366] font-semibold hover:underline"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Need immediate assistance? Message us on WhatsApp</span>
              </a>
            </div>

            {/* Technical Diagnostics (Collapsible) */}
            <div className="pt-8 border-t border-[#E7E7E7] text-left">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-neutral-500 hover:text-black py-2"
              >
                <span>TECHNICAL DIAGNOSTICS FOR SUPPORT</span>
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDetails && (
                <div className="mt-2 p-4 bg-neutral-900 text-neutral-100 rounded-[4px] text-[11px] font-mono overflow-x-auto space-y-3 relative shadow-inner">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-amber-400 font-bold">{error?.name || 'Error'}: {error?.message}</span>
                    <button
                      type="button"
                      onClick={this.handleCopyDetails}
                      className="inline-flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 rounded text-[10px] transition-colors"
                      title="Copy error details"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  {error?.stack && (
                    <div>
                      <div className="text-neutral-400 text-[10px] uppercase font-semibold mb-1">Stack Trace:</div>
                      <pre className="whitespace-pre-wrap text-[10px] text-neutral-300 leading-tight">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div className="pt-2 border-t border-neutral-800">
                      <div className="text-neutral-400 text-[10px] uppercase font-semibold mb-1">Component Hierarchy:</div>
                      <pre className="whitespace-pre-wrap text-[10px] text-neutral-400 leading-tight">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-[11px] text-neutral-400 pt-8">
            &copy; {new Date().getFullYear()} TANOAH. ALL RIGHTS RESERVED.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
