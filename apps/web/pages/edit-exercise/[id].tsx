import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { Exercise } from '@/lib/models/exercise';
import { ExerciseForm } from '../../components/exercise-form';
import { toast } from 'sonner';

export default function EditExercisePage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, isPending } = useSession();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);

  // Load exercise data
  useEffect(() => {
    const loadExercise = async () => {
      if (!id || typeof id !== 'string') return;

      setLoadingExercise(true);
      try {
        const response = await fetch(`/api/exercises/manage?exerciseId=${id}`);
        const data = await response.json();

        if (response.ok && data.success && data.exercise) {
          setExercise(data.exercise);
        } else {
          console.error('Failed to load exercise:', data.error);
          toast.error('Failed to load exercise');
          router.push('/admin');
        }
      } catch (error) {
        console.error('Error loading exercise:', error);
        toast.error('Failed to load exercise');
        router.push('/admin');
      } finally {
        setLoadingExercise(false);
      }
    };

    loadExercise();
  }, [id, router]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/auth/sign-in?redirect=' + encodeURIComponent(router.asPath));
    }
  }, [session, isPending, router]);

  if (isPending || permissionsLoading || loadingExercise) {
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

  if (!permissions?.canEditExercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to edit exercises.</p>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Exercise Not Found</h1>
          <p className="text-gray-600">The exercise you&apos;re trying to edit doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Exercise - {exercise.name} - The Exicon Project</title>
        <meta name="description" content={`Edit exercise: ${exercise.name}`} />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit Exercise</h1>
            <p className="mt-2 text-gray-600">
              Make changes to the exercise details and status.
            </p>
          </div>

          <ExerciseForm
            mode="edit"
            exercise={exercise}
            permissions={permissions}
            onCancel={() => router.back()}
          />
        </div>
      </div>
    </>
  );
} 