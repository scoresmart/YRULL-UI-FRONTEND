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

createRoot(document.getElementById('root')).render(
  <StrictMode>
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
  </StrictMode>,
)
