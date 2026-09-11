import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { queryClient } from './lib/queryClient';
import { isRealSupabaseClient } from './lib/authConfig';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { checkEnvVars } from './lib/envCheck';

// Validate env vars on startup
const envResult = checkEnvVars();
if (!envResult.ok) {
  const missing = envResult.missing.map((m) => m.key).join(', ');
  console.error(`❌ Missing required environment variables: ${missing}`);
}

if (isRealSupabaseClient()) {
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({
      session: session ?? null,
      status: session ? 'authed' : 'guest',
    });
    if (session) {
      void useAuthStore.getState().fetchProfile();
    } else {
      useAuthStore.setState({ profile: null });
    }
  });
}

function EnvError({ missing }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-red-700">Configuration Error</h1>
        <p className="mt-2 text-sm text-gray-600">The following required environment variables are missing:</p>
        <ul className="mt-3 space-y-1">
          {missing.map((m) => (
            <li key={m.key} className="rounded-lg bg-red-50 px-3 py-1.5 font-mono text-xs text-red-800">
              {m.key}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-gray-400">
          Contact your administrator or check the .env.example file for required variables.
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {!envResult.ok ? (
        <EnvError missing={envResult.missing} />
      ) : (
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'rounded-xl border border-gray-800 bg-[#111111] text-white shadow-sm',
                duration: 4000,
              }}
            />
          </BrowserRouter>
          {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </QueryClientProvider>
      )}
    </ErrorBoundary>
  </StrictMode>,
);
