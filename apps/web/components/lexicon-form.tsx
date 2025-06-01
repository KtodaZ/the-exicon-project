import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LexiconStatus, LexiconItem, Alias } from '@/lib/api/lexicon';
import { LexiconAutocomplete } from '@/components/ui/lexicon-autocomplete';
import { toast } from 'sonner';

interface LexiconFormData {
  title: string;
  description: string;
  aliases: Alias[];
  status: LexiconStatus;
}

interface LexiconFormProps {
  mode: 'create' | 'edit';
  lexicon?: LexiconItem;
  permissions: {
    canSubmitLexicon?: boolean;
    canCreateLexicon?: boolean;
    canEditLexicon?: boolean;
    canApproveLexicon?: boolean;
  };
  onCancel?: () => void;
}

export function LexiconForm({ mode, lexicon, permissions, onCancel }: LexiconFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newAlias, setNewAlias] = useState('');

  const [formData, setFormData] = useState<LexiconFormData>({
    title: '',
    description: '',
    aliases: [],
    status: 'draft',
  });

  // Initialize form data when lexicon prop changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && lexicon) {
      setFormData({
        title: lexicon.title || '',
        description: lexicon.description || '',
        aliases: lexicon.aliases || [],
        status: lexicon.status || 'draft',
      });
    }
  }, [mode, lexicon]);

  // Set default status based on permissions (for create mode)
  useEffect(() => {
    if (mode === 'create' && permissions) {
      if (permissions.canSubmitLexicon && formData.status === 'draft') {
        setFormData(prev => ({ ...prev, status: 'submitted' }));
      }
    }
  }, [mode, permissions, formData.status]);

  const handleInputChange = (field: keyof LexiconFormData, value: string | Alias[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddAlias = (aliasName?: string) => {
    const aliasToAdd = aliasName || newAlias;
    if (!aliasToAdd.trim()) return;

    const newAliasObj: Alias = {
      name: aliasToAdd.trim(),
      id: aliasToAdd.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
    };

    // Check for duplicates (case-insensitive)
    if (formData.aliases.some(alias => 
      alias.name.toLowerCase() === newAliasObj.name.toLowerCase()
    )) {
      toast.error('This alias already exists');
      return;
    }

    setFormData(prev => ({
      ...prev,
      aliases: [...prev.aliases, newAliasObj]
    }));
    
    setNewAlias('');
  };

  const handleRemoveAlias = (aliasToRemove: Alias) => {
    setFormData(prev => ({
      ...prev,
      aliases: prev.aliases.filter(alias => alias.id !== aliasToRemove.id)
    }));
  };

  const handleAliasKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAlias();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Basic validation
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      let response;
      let requestBody;

      if (mode === 'create') {
        response = await fetch('/api/lexicon/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        requestBody = {
          lexiconId: lexicon?._id,
          ...formData,
        };
        response = await fetch('/api/lexicon/manage', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${mode} lexicon item`);
      }

      // Show success message
      if (mode === 'create') {
        if (data.lexicon.status === 'active') {
          toast.success('Lexicon item created and published successfully!');
        } else {
          toast.success('Lexicon item submitted for review successfully!');
        }
        
        // Reset form for create mode
        setFormData({
          title: '',
          description: '',
          aliases: [],
          status: 'draft',
        });
        setNewAlias('');
        
        // Redirect after delay
        setTimeout(() => {
          router.push('/lexicon');
        }, 2000);
      } else {
        toast.success(data.message || 'Lexicon item updated successfully!');
        
        // Redirect based on status
        if (data.lexicon?.status === 'active') {
          router.push(`/lexicon/${data.lexicon.urlSlug}`);
        } else {
          router.push('/admin');
        }
      }
    } catch (error) {
      console.error(`Error ${mode === 'create' ? 'submitting' : 'updating'} lexicon item:`, error);
      const errorMessage = error instanceof Error ? error.message : `An error occurred while ${mode === 'create' ? 'submitting' : 'updating'} the lexicon item`;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: LexiconStatus) => {
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

  const statusInfo = getStatusInfo(formData.status);
  const isFormValid = formData.title.trim() && formData.description.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Lexicon Details
            {mode === 'edit' && (
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter lexicon item title"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description * (use @ to reference other lexicon terms)
            </label>
            <LexiconAutocomplete
              value={formData.description}
              onChange={(value) => handleInputChange('description', value)}
              placeholder="Provide a brief description of this lexicon item (use @ to reference other terms)"
            />
          </div>

          {/* Aliases section */}
          <div>
            <label htmlFor="aliases" className="block text-sm font-medium text-gray-700 mb-1">
              Aliases (optional)
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="aliases"
                  type="text"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  onKeyPress={handleAliasKeyPress}
                  placeholder="Enter an alias or alternative name"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleAddAlias()}
                  disabled={!newAlias.trim()}
                >
                  Add
                </Button>
              </div>
              
              {/* Display current aliases */}
              {formData.aliases.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.aliases.map((alias) => (
                    <Badge
                      key={alias.id}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      {alias.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveAlias(alias)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500">
                Add alternative names or abbreviations that people might use to search for this term
              </p>
            </div>
          </div>

          {(permissions?.canApproveLexicon || permissions?.canCreateLexicon) && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as LexiconStatus)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="active">Active</option>
                {permissions?.canApproveLexicon && <option value="archived">Archived</option>}
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
                'Update Lexicon Item'
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
              {loading ? 'Submitting...' : 'Submit Lexicon Item'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onCancel || (() => router.push('/lexicon'))}
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

export default LexiconForm; 