import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';

export default function MyApp({
  Component,
  pageProps: { session, ...pageProps }
}: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        <Head>
          <title>The Exicon Project</title>
          <meta name="description" content="The Exicon Project - A comprehensive exercise collection" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <MainLayout>
          <Component {...pageProps} />
        </MainLayout>
      </SessionProvider>
    </QueryClientProvider>
  );
}