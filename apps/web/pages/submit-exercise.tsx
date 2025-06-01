import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { ExerciseForm } from '@/components/exercise-form';

export default function SubmitExercise() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();

  // Redirect if not logged in
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/auth/sign-in?redirect=/submit-exercise');
    }
  }, [session, isPending, router]);

  if (isPending || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Will redirect
  }

  if (!permissions?.canSubmitExercise && !permissions?.canCreateExercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to submit exercises.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Submit Exercise - The Exicon Project</title>
        <meta name="description" content="Submit a new exercise to The Exicon Project" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-0 sm:px-6 py-6">
          <div className="bg-white rounded-none sm:rounded-lg shadow-none sm:shadow-md p-4 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Submit Exercise</h1>
            
            <ExerciseForm
              mode="create"
              permissions={permissions}
              onCancel={() => router.push('/')}
            />
          </div>
        </div>
      </div>
    </>
  );
} 