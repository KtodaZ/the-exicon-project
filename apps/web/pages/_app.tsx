import '@/styles/globals.css';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { ToastProvider } from '@/components/ui/toast-provider';
import { useNavigationHistory } from '@/lib/navigation-history';

export default function MyApp({
  Component,
  pageProps
}: AppProps) {
  // Tracks where the user came from so list pages can restore their state
  // when the user returns from a detail page.
  useNavigationHistory();

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        // Keep list results around long enough that returning from a detail
        // page can rebuild the list from cache instead of refetching it.
        gcTime: 30 * 60 * 1000, // 30 minutes
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>The Exicon Project</title>
        <meta name="description" content="The Exicon Project - A comprehensive exercise collection" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout>
        <Component {...pageProps} />
      </MainLayout>
      <ToastProvider />
    </QueryClientProvider>
  );
}