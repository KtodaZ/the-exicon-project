import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExerciseStatus, Exercise, Alias } from '@/lib/models/exercise';
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

interface ExerciseFormProps {
  mode: 'create' | 'edit';
  exercise?: Exercise;
  permissions: {
    canSubmitExercise?: boolean;
    canCreateExercise?: boolean;
    canEditExercise?: boolean;
    canApproveExercise?: boolean;
  };
  onCancel?: () => void;
}

export function ExerciseForm({ mode, exercise, permissions, onCancel }: ExerciseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  // Initialize form data when exercise prop changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && exercise) {
      setFormData({
        name: exercise.name || '',
        aliases: exercise.aliases || [],
        description: exercise.description || '',
        text: exercise.text || '',
        tags: exercise.tags || [],
        difficulty: exercise.difficulty || 0.5,
        video_url: exercise.video_url || '',
        image_url: exercise.image_url || '',
        status: exercise.status || 'draft',
      });
    }
  }, [mode, exercise]);

  // Set default status based on permissions (for create mode)
  useEffect(() => {
    if (mode === 'create' && permissions) {
      if (permissions.canSubmitExercise && formData.status === 'draft') {
        setFormData(prev => ({ ...prev, status: 'submitted' }));
      }
    }
  }, [mode, permissions, formData.status]);

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
      let response;
      let requestBody;

      if (mode === 'create') {
        response = await fetch('/api/exercises/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        requestBody = {
          exerciseId: exercise?._id,
          ...formData,
        };
        response = await fetch('/api/exercises/manage', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${mode} exercise`);
      }

      // Show success message
      if (mode === 'create') {
        if (data.exercise.status === 'active') {
          toast.success('Exercise created and published successfully!');
        } else {
          toast.success('Exercise submitted for review successfully!');
        }
        
        // Reset form for create mode
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
        
        // Redirect after delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        toast.success(data.message || 'Exercise updated successfully!');
        
        // Small delay to ensure cache invalidation is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Redirect based on status
        if (data.exercise?.status === 'active') {
          const targetUrl = `/exicon/${data.exercise.urlSlug}`;
          
          // Check if we're already on the target page
          if (router.asPath.startsWith(targetUrl)) {
            // Force a hard reload to bypass all caches
            window.location.href = targetUrl;
          } else {
            // Use replace with cache-busting parameter to force fresh page load
            const cacheBuster = `?updated=${Date.now()}`;
            router.replace(`${targetUrl}${cacheBuster}`);
          }
        } else {
          router.replace('/admin');
        }
      }
    } catch (error) {
      console.error(`Error ${mode === 'create' ? 'submitting' : 'updating'} exercise:`, error);
      const errorMessage = error instanceof Error ? error.message : `An error occurred while ${mode === 'create' ? 'submitting' : 'updating'} the exercise`;
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

  const statusInfo = getStatusInfo(formData.status);
  const isFormValid = formData.name.trim() && formData.description.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Exercise Details
            {mode === 'edit' && (
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            )}
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
              placeholder={mode === 'create' ? "Enter exercise name" : "e.g., Navy Seal Burpee"}
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
            <ExerciseAutocomplete
              value={formData.description}
              onChange={(value) => handleInputChange('description', value)}
              placeholder={mode === 'create' 
                ? "Briefly describe the exercise (use @ to reference other exercises)"
                : "Brief description of the exercise (use @ to reference other exercises)"
              }
              maxLength={150}
            />
          </div>

          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
              Detailed Instructions
            </label>
            <ExerciseAutocomplete
              value={formData.text}
              onChange={(value) => handleInputChange('text', value)}
              placeholder={mode === 'create'
                ? "Provide detailed instructions for the exercise (use @ to reference other exercises)"
                : "Detailed instructions for performing the exercise (use @ to reference other exercises)"
              }
            />
          </div>

          <TagsAutocomplete
            selectedTags={formData.tags}
            onTagsChange={handleTagsChange}
            placeholder="Start typing to see tag suggestions..."
          />

          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty: {mode === 'edit' ? `${Math.round(formData.difficulty * 100)}%` : getDifficultyLabel(formData.difficulty)}
            </label>
            <input
              id="difficulty"
              type="range"
              min="0"
              max="1"
              step={mode === 'edit' ? "0.1" : "0.25"}
              value={formData.difficulty}
              onChange={(e) => handleInputChange('difficulty', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              {mode === 'edit' ? (
                <>
                  <span>Beginner</span>
                  <span>Intermediate</span>
                  <span>Advanced</span>
                </>
              ) : (
                <>
                  <span>Very Easy</span>
                  <span>Easy</span>
                  <span>Medium</span>
                  <span>Hard</span>
                  <span>Very Hard</span>
                </>
              )}
            </div>
          </div>

          <div className={mode === 'edit' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
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

      <div className={mode === 'edit' ? "flex justify-end space-x-4" : "flex gap-4 pt-4"}>
        {mode === 'edit' ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel || (() => router.back())}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !isFormValid}
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
          </>
        ) : (
          <>
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="flex-1"
            >
              {loading ? 'Submitting...' : 'Submit Exercise'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onCancel || (() => router.push('/'))}
              disabled={loading}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

export default ExerciseForm; 