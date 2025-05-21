import { ReactNode } from 'react';
import Head from 'next/head';

type SimpleLayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function SimpleLayout({ children, title = 'The Exicon Project' }: SimpleLayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <div className="min-h-screen bg-black text-white">
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </>
  );
}