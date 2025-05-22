import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GetStaticProps } from 'next';
import Head from 'next/head';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found | The Exicon Project</title>
      </Head>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Page not found
        </p>
        <Link href="/">
          <Button variant="red">
            Return Home
          </Button>
        </Link>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {}
  };
};