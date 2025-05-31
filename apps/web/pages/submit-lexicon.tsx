import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LexiconStatus, Alias } from '@/lib/api/lexicon';
import { Textarea } from '@/components/ui/textarea';
import { LexiconAutocomplete } from '@/components/ui/lexicon-autocomplete';
import { toast } from 'sonner';

interface LexiconFormData {
  title: string;
  description: string;
  rawHTML: string;
  aliases: Alias[];
  status: LexiconStatus;
}

export default function SubmitLexicon() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<LexiconFormData>({
    title: '',
    description: '',
    rawHTML: '',
    aliases: [],
    status: 'draft',
  });
  const [newAlias, setNewAlias] = useState('');

  // Update default status based on permissions
  useEffect(() => {
    if (!permissions) return;
    
    // Only set default status if form is still at initial draft state
    if (permissions.canSubmitLexicon && formData.status === 'draft') {
      setFormData(prev => ({ ...prev, status: 'submitted' }));
    }
  }, [permissions, formData.status]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/auth/sign-in?redirect=/submit-lexicon');
    }
  }, [session, isPending, router]);

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
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/lexicon/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit lexicon item');
      }

      if (data.lexicon.status === 'active') {
        setSuccess('Lexicon item created and published successfully!');
        toast.success('Lexicon item created and published successfully!');
      } else {
        setSuccess('Lexicon item submitted for review successfully!');
        toast.success('Lexicon item saved successfully!');
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        rawHTML: '',
        aliases: [],
        status: 'draft',
      });
      setNewAlias('');

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/lexicon');
      }, 2000);

    } catch (error) {
      console.error('Error submitting lexicon item:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
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

  const canSubmitLexicon = permissions?.canSubmitLexicon;
  const canCreateLexicon = permissions?.canCreateLexicon;

  if (!canSubmitLexicon && !canCreateLexicon) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to submit lexicon items.</p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(formData.status);

  return (
    <>
      <Head>
        <title>Submit Lexicon Item - The Exicon Project</title>
        <meta name="description" content="Submit a new lexicon item to The Exicon Project" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-0 sm:px-6 py-6">
          <div className="bg-white rounded-none sm:rounded-lg shadow-none sm:shadow-md p-4 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Submit Lexicon Item</h1>
            
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
                    Lexicon Details
                    <Badge className={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
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
                      maxLength={500}
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

                  <div>
                    <label htmlFor="rawHTML" className="block text-sm font-medium text-gray-700 mb-1">
                      Content (optional) (use @ to reference other lexicon terms)
                    </label>
                    <LexiconAutocomplete
                      value={formData.rawHTML}
                      onChange={(value) => handleInputChange('rawHTML', value)}
                      placeholder="Provide detailed content for this lexicon item (use @ to reference other terms)"
                    />
                    <p className="mt-1 text-xs text-gray-500">You can use HTML formatting and @ to reference other lexicon terms</p>
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

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading || !formData.title || !formData.description}
                  className="flex-1"
                >
                  {loading ? 'Submitting...' : 'Submit Lexicon Item'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/lexicon')}
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