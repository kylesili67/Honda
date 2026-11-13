import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { SplashScreen } from './components/layout/SplashScreen';
import { AppRoutes } from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F6] p-6">
          <div className="max-w-md w-full rounded-xl border border-[#E3E4E7] bg-white p-8 text-center shadow-sm">
            <svg
              width="40"
              height="40"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
              className="mx-auto mb-4"
            >
              <circle cx="24" cy="24" r="21" stroke="#111214" strokeWidth="2.2" />
              <circle cx="24" cy="24" r="15.5" stroke="rgba(17,18,20,0.16)" strokeWidth="2.5" />
              <path d="M12.5 34.5 A15.5 15.5 0 1 1 35.5 13.5" stroke="#D71920" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M24 24 L33.5 14.5" stroke="#111214" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="24" cy="24" r="3" fill="#D71920" />
            </svg>
            <h1 className="font-display text-3xl font-bold text-[#111214]">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-[#6B7078]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-[#D71920] px-5 text-sm font-semibold text-white hover:bg-[#B8141A]"
            >
              Reload Showroom
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                <BrowserRouter>
                  <SplashScreen />
                  <AppRoutes />
                </BrowserRouter>
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
