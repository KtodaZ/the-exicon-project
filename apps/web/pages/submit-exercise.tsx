import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExerciseStatus, Alias } from '@/lib/models/exercise';
import { Textarea } from '@/components/ui/textarea';
import { TagsAutocomplete } from '@/components/ui/tags-autocomplete';
import { ExerciseAutocomplete } from '@/components/ui/exercise-autocomplete';
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

export default function SubmitExercise() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const [tagInput, setTagInput] = useState('');

  // Update default status based on permissions
  useEffect(() => {
    if (!permissions) return;
    
    // Only set default status if form is still at initial draft state
    // This allows users with create permissions to still choose draft if they want
    if (permissions.canCreateExercise && formData.status === 'draft') {
      // Don't auto-change to active, let users choose
      // setFormData(prev => ({ ...prev, status: 'active' }));
    } else if (permissions.canSubmitExercise && formData.status === 'draft') {
      setFormData(prev => ({ ...prev, status: 'submitted' }));
    }
  }, [permissions, formData.status]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/auth/sign-in?redirect=/submit-exercise');
    }
  }, [session, isPending, router]);

  const handleInputChange = (field: keyof ExerciseFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim().toLowerCase()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
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
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/exercises/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit exercise');
      }

      if (data.exercise.status === 'active') {
        setSuccess('Exercise created and published successfully!');
        toast.success('Exercise created and published successfully!');
      } else {
        setSuccess('Exercise submitted for review successfully!');
        toast.success('Exercise saved successfully!');
      }

      // Reset form
      setFormData({
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

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error) {
      console.error('Error submitting exercise:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
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

  const difficultyLabels = [
    'Very Easy',
    'Easy', 
    'Medium',
    'Hard',
    'Very Hard'
  ];

  const getDifficultyLabel = (value: number) => {
    const index = Math.round(value * 4);
    return difficultyLabels[index] || 'Medium';
  };

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

  const statusInfo = getStatusInfo(formData.status);

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
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {success}
              </div>
            )}

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
                      placeholder="Enter exercise name"
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
                      Description *
                    </label>
                    <ExerciseAutocomplete
                      value={formData.description}
                      onChange={(value) => handleInputChange('description', value)}
                      placeholder="Briefly describe the exercise (use @ to reference other exercises)"
                      maxLength={120}
                    />
                  </div>

                  <div>
                    <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
                      Exercise Instructions *
                    </label>
                    <ExerciseAutocomplete
                      value={formData.text}
                      onChange={(value) => handleInputChange('text', value)}
                      placeholder="Provide detailed instructions for the exercise (use @ to reference other exercises)"
                    />
                  </div>

                  <TagsAutocomplete
                    selectedTags={formData.tags}
                    onTagsChange={handleTagsChange}
                    placeholder="Start typing to see tag suggestions..."
                  />

                  <div>
                    <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty: {getDifficultyLabel(formData.difficulty)}
                    </label>
                    <input
                      id="difficulty"
                      type="range"
                      min="0"
                      max="1"
                      step="0.25"
                      value={formData.difficulty}
                      onChange={(e) => handleInputChange('difficulty', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Very Easy</span>
                      <span>Easy</span>
                      <span>Medium</span>
                      <span>Hard</span>
                      <span>Very Hard</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="video_url" className="block text-sm font-medium text-gray-700 mb-1">
                      Video URL (optional)
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
                      Image URL (optional)
                    </label>
                    <Input
                      id="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => handleInputChange('image_url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  {(permissions?.canApproveExercise || permissions?.canCreateExercise) && (
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
                        {permissions?.canApproveExercise && <option value="archived">Archived</option>}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">{statusInfo.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading || !formData.name || !formData.description || !formData.text}
                  className="flex-1"
                >
                  {loading ? 'Submitting...' : 'Submit Exercise'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
} 