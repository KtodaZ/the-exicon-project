import Head from 'next/head';
import { SignUpForm } from '@/components/auth/sign-up-form';

export default function SignUpPage() {
  return (
    <>
      <Head>
        <title>Sign Up | The Exicon Project</title>
        <meta name="description" content="Create your account" />
      </Head>
      
      <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <SignUpForm />
        </div>
      </div>
    </>
  );
} 