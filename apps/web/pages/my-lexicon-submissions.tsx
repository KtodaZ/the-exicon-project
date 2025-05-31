import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { LexiconListItem } from '@/lib/api/lexicon';
import { toast } from 'sonner';
import { Plus, Eye, Edit, Send, Trash2 } from 'lucide-react';

export default function MyLexiconSubmissionsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const [lexiconItems, setLexiconItems] = useState<LexiconListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user's submitted lexicon items (all statuses)
  useEffect(() => {
    const loadSubmissions = async () => {
      if (!session?.user) return;
      
      setLoading(true);
      
      try {
        // Use the manage API which is more efficient for getting user-specific items
        const response = await fetch('/api/lexicon/manage?userOnly=true&limit=100');
        const data = await response.json();
        
        if (response.ok && data.success && data.lexicon) {
          // Sort by submission date
          const sortedItems = data.lexicon.sort((a: LexiconListItem, b: LexiconListItem) => {
            const dateA = new Date(a.submittedAt || 0);
            const dateB = new Date(b.submittedAt || 0);
            return dateB.getTime() - dateA.getTime();
          });
          
          setLexiconItems(sortedItems);
        } else {
          console.error('Failed to load lexicon submissions:', data.error);
          setLexiconItems([]);
        }
      } catch (error) {
        console.error('Error loading lexicon submissions:', error);
        setLexiconItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [session]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/auth/sign-in?redirect=/my-lexicon-submissions');
    }
  }, [session, isPending, router]);

  const handleDelete = async (lexiconId: string) => {
    if (!confirm('Are you sure you want to delete this lexicon item? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/lexicon/manage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lexiconId }),
      });

      if (response.ok) {
        setLexiconItems(prev => prev.filter(item => item._id !== lexiconId));
        toast.success('Lexicon item deleted successfully');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete lexicon item');
      }
    } catch (error) {
      console.error('Error deleting lexicon item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete lexicon item');
    }
  };

  const handleSubmitForReview = async (lexiconId: string) => {
    if (!confirm('Submit this draft for review? It will be reviewed by our team before becoming active.')) {
      return;
    }

    try {
      const response = await fetch('/api/lexicon/manage', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lexiconId,
          status: 'submitted',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setLexiconItems(prev => 
          prev.map(item => 
            item._id === lexiconId 
              ? { ...item, status: 'submitted' }
              : item
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

  // Group items by status
  const itemsByStatus = {
    draft: lexiconItems.filter(item => item.status === 'draft'),
    submitted: lexiconItems.filter(item => item.status === 'submitted'),
    active: lexiconItems.filter(item => item.status === 'active'),
    archived: lexiconItems.filter(item => item.status === 'archived'),
  };

  return (
    <>
      <Head>
        <title>My Lexicon Submissions - The Exicon Project</title>
        <meta name="description" content="View and manage all your lexicon submissions" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Lexicon Submissions</h1>
              <p className="mt-2 text-gray-600">
                View and manage all lexicon items you&apos;ve submitted to The Exicon Project.
              </p>
            </div>
            <Link href="/submit-lexicon">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Lexicon Item
              </Button>
            </Link>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-700">
                {itemsByStatus.draft.length}
              </div>
              <div className="text-sm text-gray-500">Drafts</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600">
                {itemsByStatus.submitted.length}
              </div>
              <div className="text-sm text-gray-500">Pending Review</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {itemsByStatus.active.length}
              </div>
              <div className="text-sm text-gray-500">Published</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">
                {itemsByStatus.archived.length}
              </div>
              <div className="text-sm text-gray-500">Archived</div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading your submissions...</p>
            </div>
          ) : lexiconItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
              <p className="text-gray-600 mb-4">
                You have not submitted any lexicon items yet. Start by creating your first one!
              </p>
              <Link href="/submit-lexicon">
                <Button>
                  Create Your First Lexicon Item
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lexiconItems.map((item) => (
                <div key={item._id} className="relative group">
                  {/* Lexicon Item Card */}
                  <Card className="relative hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-start justify-between text-lg">
                        <span className="line-clamp-1">{item.title}</span>
                        <StatusBadge status={item.status} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {item.description}
                      </p>
                      <div className="mt-4 text-xs text-gray-500">
                        Submitted: {item.submittedAt 
                          ? new Date(item.submittedAt).toLocaleDateString()
                          : 'N/A'
                        }
                      </div>
                    </CardContent>

                    {/* Action Buttons Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg">
                      <div className="flex flex-col space-y-2">
                        {item.status === 'active' ? (
                          <Link href={`/lexicon/${item.urlSlug}`}>
                            <Button size="sm" variant="outline" className="bg-white text-black hover:bg-gray-100">
                              <Eye className="h-4 w-4 mr-2" />
                              View Live
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white text-black hover:bg-gray-100"
                            onClick={() => router.push(`/edit-lexicon/${item._id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                        
                        {item.status === 'draft' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleSubmitForReview(item._id)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Submit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(item._id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {lexiconItems.length > 0 && (
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>
                Showing {lexiconItems.length} submission{lexiconItems.length !== 1 ? 's' : ''} across all statuses.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}