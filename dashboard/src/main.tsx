import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const query_client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute - data is considered fresh for 60s
      gcTime: 300000, // 5 minutes - cached data kept in memory for 5min
      refetchOnWindowFocus: false, // Disable auto-refetch on window focus
      refetchOnMount: false, // Disable refetch when component mounts
      refetchOnReconnect: false, // Disable refetch on network reconnect
      retry: 1, // Only retry failed queries once
    },
  },
});

// Initialize theme before first render to prevent flash
function init_theme() {
  const stored_theme = localStorage.getItem('clawkeeper-theme');
  const theme = stored_theme || 'dark';
  
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Run theme initialization immediately
init_theme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={query_client}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
