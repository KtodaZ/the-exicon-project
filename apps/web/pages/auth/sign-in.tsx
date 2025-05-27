import Head from 'next/head';
import { SignInForm } from '@/components/auth/sign-in-form';

export default function SignInPage() {
  return (
    <>
      <Head>
        <title>Sign In | The Exicon Project</title>
        <meta name="description" content="Sign in to your account" />
      </Head>
      
      <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <SignInForm />
        </div>
      </div>
    </>
  );
} 