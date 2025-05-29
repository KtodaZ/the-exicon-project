import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExerciseStatus, Exercise, Alias } from '@/lib/models/exercise';
import { Textarea } from '../../components/ui/textarea';
import { TagsAutocomplete } from '../../components/ui/tags-autocomplete';
import { toast } from 'sonner';

interface ExerciseFormData {
  name: string;
  aliases: Alias[];
  description: string;
  text: string;
  tags: string[];
  difficulty: number;
  video_url: string;
  image_url: string;
  status: ExerciseStatus;
}

export default function EditExercisePage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, isPending } = useSession();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);

  const [formData, setFormData] = useState<ExerciseFormData>({
    name: '',
    aliases: [],
    description: '',
    text: '',
    tags: [],
    difficulty: 0.5,
    video_url: '',
    image_url: '',
    status: 'draft',
  });

  // Load exercise data
  useEffect(() => {
    const loadExercise = async () => {
      if (!id || typeof id !== 'string') return;

      setLoadingExercise(true);
      try {
        const response = await fetch(`/api/exercises/manage?exerciseId=${id}`);
        const data = await response.json();

        if (response.ok && data.success && data.exercise) {
          const exerciseData = data.exercise;
          setExercise(exerciseData);
          
          // Populate form with existing data
          setFormData({
            name: exerciseData.name || '',
            aliases: exerciseData.aliases || [],
            description: exerciseData.description || '',
            text: exerciseData.text || '',
            tags: exerciseData.tags || [],
            difficulty: exerciseData.difficulty || 0.5,
            video_url: exerciseData.video_url || '',
            image_url: exerciseData.image_url || '',
            status: exerciseData.status || 'draft',
          });
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

  const handleInputChange = (field: keyof ExerciseFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({
      ...prev,
      tags,
    }));
  };

  const handleAddAlias = (aliasName: string) => {
    if (!aliasName.trim()) return;
    
    const newAlias: Alias = {
      name: aliasName.trim(),
      id: aliasName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
    };

    // Check if alias already exists
    if (formData.aliases.some(alias => alias.name.toLowerCase() === newAlias.name.toLowerCase())) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      aliases: [...prev.aliases, newAlias],
    }));
  };

  const handleRemoveAlias = (aliasToRemove: Alias) => {
    setFormData(prev => ({
      ...prev,
      aliases: prev.aliases.filter(alias => alias.id !== aliasToRemove.id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Basic validation
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/exercises/manage', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exerciseId: id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update exercise');
      }

      // Show success message
      toast.success(data.message || 'Exercise updated successfully!');
      
      // Redirect to admin or exercise page
      if (data.exercise?.status === 'active') {
        router.push(`/exicon/${data.exercise.urlSlug}`);
      } else {
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update exercise. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: ExerciseStatus) => {
    switch (status) {
      case 'draft':
        return { label: 'Draft', color: 'bg-gray-100 text-gray-800', description: 'Saved as draft' };
      case 'submitted':
        return { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800', description: 'Awaiting approval' };
      case 'active':
        return { label: 'Active', color: 'bg-green-100 text-green-800', description: 'Publicly visible' };
      case 'archived':
        return { label: 'Archived', color: 'bg-red-100 text-red-800', description: 'No longer active' };
    }
  };

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

  const statusInfo = getStatusInfo(formData.status);

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

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Exercise Details
                  <Badge className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Exercise Name *
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Navy Seal Burpee"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Also Known As (Aliases)
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Add an alias..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const target = e.target as HTMLInputElement;
                            handleAddAlias(target.value);
                            target.value = '';
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          if (input) {
                            handleAddAlias(input.value);
                            input.value = '';
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    {formData.aliases.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.aliases.map((alias) => (
                          <Badge
                            key={alias.id}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                          >
                            {alias.name}
                            <button
                              type="button"
                              onClick={() => handleRemoveAlias(alias)}
                              className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Short Description *
                  </label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of the exercise..."
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
                    Detailed Instructions
                  </label>
                  <Textarea
                    id="text"
                    value={formData.text}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('text', e.target.value)}
                    placeholder="Detailed instructions for performing the exercise..."
                    rows={5}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="video_url" className="block text-sm font-medium text-gray-700 mb-1">
                      Video URL
                    </label>
                    <Input
                      id="video_url"
                      type="url"
                      value={formData.video_url}
                      onChange={(e) => handleInputChange('video_url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">
                      Image URL
                    </label>
                    <Input
                      id="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => handleInputChange('image_url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty Level: {Math.round(formData.difficulty * 100)}%
                  </label>
                  <input
                    id="difficulty"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.difficulty}
                    onChange={(e) => handleInputChange('difficulty', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Beginner</span>
                    <span>Intermediate</span>
                    <span>Advanced</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <TagsAutocomplete
                    selectedTags={formData.tags}
                    onTagsChange={handleTagsChange}
                    placeholder="Start typing to see tag suggestions..."
                  />
                </div>

                {permissions?.canApproveExercise && (
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value as ExerciseStatus)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">{statusInfo.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  'Update Exercise'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
} 