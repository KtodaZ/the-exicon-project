import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import Head from 'next/head';

export default function MyApp({
  Component,
  pageProps: { session, ...pageProps }
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <Head>
        <title>The Exicon Project</title>
        <meta name="description" content="The Exicon Project - A blank canvas for your next great idea" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-black text-white">
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
}