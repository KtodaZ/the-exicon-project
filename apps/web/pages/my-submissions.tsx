import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ExerciseCard } from '@/components/exercise-card';
import { ExerciseListItem } from '@/lib/models/exercise';
import { toast } from 'sonner';

export default function MySubmissionsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user's submitted exercises (all statuses)
  useEffect(() => {
    const loadSubmissions = async () => {
      if (!session?.user) return;
      
      setLoading(true);
      
      try {
        // Use the manage API which is more efficient for getting user-specific exercises
        const response = await fetch('/api/exercises/manage?userOnly=true&limit=100');
        const data = await response.json();
        
        if (response.ok && data.success && data.exercises) {
          // Sort by submission date
          const sortedExercises = data.exercises.sort((a: ExerciseListItem, b: ExerciseListItem) => {
            const dateA = new Date(a.submittedAt || a.createdAt || 0);
            const dateB = new Date(b.submittedAt || b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
          });
          
          setExercises(sortedExercises);
        } else {
          console.error('Failed to load submissions:', data.error);
          setExercises([]);
        }
      } catch (error) {
        console.error('Error loading submissions:', error);
        setExercises([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [session]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/auth/sign-in?redirect=/my-submissions');
    }
  }, [session, isPending, router]);

  const handleDelete = async (exerciseId: string) => {
    if (!confirm('Are you sure you want to delete this exercise? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/exercises/manage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exerciseId }),
      });

      if (response.ok) {
        setExercises(prev => prev.filter(ex => ex._id !== exerciseId));
        toast.success('Exercise deleted successfully');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete exercise');
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete exercise');
    }
  };

  const handleSubmitForReview = async (exerciseId: string) => {
    if (!confirm('Submit this draft for review? It will be reviewed by our team before becoming active.')) {
      return;
    }

    try {
      const response = await fetch('/api/exercises/manage', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exerciseId,
          status: 'submitted',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setExercises(prev => 
          prev.map(ex => 
            ex._id === exerciseId 
              ? { ...ex, status: 'submitted' }
              : ex
          )
        );
        toast.success('Draft submitted for review successfully!');
      } else {
        throw new Error(data.error || 'Failed to submit draft');
      }
    } catch (error) {
      console.error('Error submitting draft:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit draft');
    }
  };

  if (isPending) {
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

  // Group exercises by status
  const exercisesByStatus = {
    draft: exercises.filter(ex => ex.status === 'draft'),
    submitted: exercises.filter(ex => ex.status === 'submitted'),
    active: exercises.filter(ex => ex.status === 'active'),
    archived: exercises.filter(ex => ex.status === 'archived'),
  };

  return (
    <>
      <Head>
        <title>My Submissions - The Exicon Project</title>
        <meta name="description" content="View and manage all your exercise submissions" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Submissions</h1>
              <p className="mt-2 text-gray-600">
                View and manage all exercises you've submitted to The Exicon Project.
              </p>
            </div>
            <Link href="/submit-exercise">
              <Button>
                ➕ New Exercise
              </Button>
            </Link>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-700">
                {exercisesByStatus.draft.length}
              </div>
              <div className="text-sm text-gray-500">Drafts</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600">
                {exercisesByStatus.submitted.length}
              </div>
              <div className="text-sm text-gray-500">Pending Review</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {exercisesByStatus.active.length}
              </div>
              <div className="text-sm text-gray-500">Published</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">
                {exercisesByStatus.archived.length}
              </div>
              <div className="text-sm text-gray-500">Archived</div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading your submissions...</p>
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
              <p className="text-gray-600 mb-4">
                You haven't submitted any exercises yet. Start by creating your first exercise!
              </p>
              <Link href="/submit-exercise">
                <Button>
                  Create Your First Exercise
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-8">
              {exercises.map((exercise) => (
                <div key={exercise._id} className="relative">
                  {/* Exercise Card */}
                  <div className="relative">
                    <ExerciseCard exercise={exercise} />
                    
                    {/* Status Badge Overlay */}
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={exercise.status} />
                    </div>
                  </div>

                  {/* Action Buttons Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                    <div className="flex flex-col space-y-2">
                      {exercise.status === 'active' ? (
                        <Link href={`/exicon/${exercise.urlSlug}`}>
                          <Button size="sm" variant="outline" className="bg-white text-black hover:bg-gray-100">
                            👁️ View Live
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white text-black hover:bg-gray-100"
                          onClick={() => router.push(`/edit-exercise/${exercise._id}`)}
                        >
                          ✏️ Edit
                        </Button>
                      )}
                      
                      {exercise.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleSubmitForReview(exercise._id)}
                          >
                            📤 Submit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(exercise._id)}
                          >
                            🗑️ Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Submission Date */}
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Submitted: {exercise.submittedAt 
                      ? new Date(exercise.submittedAt).toLocaleDateString()
                      : 'N/A'
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

          {exercises.length > 0 && (
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>
                Showing {exercises.length} submission{exercises.length !== 1 ? 's' : ''} across all statuses.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 