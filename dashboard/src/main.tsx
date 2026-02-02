import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const query_client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000,
      refetchInterval: 30000, // Refetch every 30s
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={query_client}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
