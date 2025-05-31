import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { LexiconListItem, LexiconStatus } from '@/lib/api/lexicon';
import { toast } from 'sonner';

interface LexiconManagementProps {
  className?: string;
}

export function LexiconManagement({ className }: LexiconManagementProps) {
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const [lexiconItems, setLexiconItems] = useState<LexiconListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LexiconStatus | 'all'>('all');

  // Load lexicon items from API
  useEffect(() => {
    const loadLexiconItems = async () => {
      if (!permissions?.canViewAllLexicon) return;
      
      setLoading(true);
      
      try {
        const response = await fetch(`/api/lexicon/manage?status=${statusFilter}&limit=50`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setLexiconItems(data.lexicon || []);
        } else {
          console.error('Failed to load lexicon items:', data.error);
          setLexiconItems([]);
        }
      } catch (error) {
        console.error('Error loading lexicon items:', error);
        setLexiconItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadLexiconItems();
  }, [permissions?.canViewAllLexicon, statusFilter]);

  const handleStatusChange = async (lexiconId: string, newStatus: LexiconStatus) => {
    if (!permissions?.canApproveLexicon && !permissions?.canEditLexicon) return;

    try {
      const response = await fetch('/api/lexicon/manage', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lexiconId,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update lexicon item status');
      }
      
      // Update local state
      setLexiconItems(prev => 
        prev.map(item => 
          item._id === lexiconId 
            ? { ...item, status: newStatus }
            : item
        )
      );
      
      toast.success(data.message || `Lexicon item status changed to ${newStatus}`);
    } catch (error) {
      console.error('Error changing lexicon item status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to change lexicon item status');
    }
  };

  const filteredItems = statusFilter === 'all' 
    ? lexiconItems 
    : lexiconItems.filter(item => item.status === statusFilter);

  if (!permissions?.canViewAllLexicon) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Lexicon Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-red-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You don&apos;t have permission to view lexicon management.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Lexicon Management</CardTitle>
          
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="lexicon-status-filter" className="text-sm font-medium text-gray-700">
              Filter by status:
            </label>
            <select
              id="lexicon-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LexiconStatus | 'all')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading lexicon items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No lexicon items found</h3>
            <p className="text-gray-600">
              No lexicon items found for status: {statusFilter}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lexicon Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item._id}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-2">{item.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.submittedBy || 'System'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.submittedAt 
                        ? new Date(item.submittedAt).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {permissions?.canApproveLexicon && item.status === 'submitted' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(item._id, 'active')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(item._id, 'draft')}
                            >
                              Return to Draft
                            </Button>
                          </>
                        )}
                        
                        {permissions?.canEditLexicon && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              window.location.href = `/edit-lexicon/${item._id}`;
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        
                        {permissions?.canApproveLexicon && item.status === 'active' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusChange(item._id, 'archived')}
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {lexiconItems.filter(item => item.status === 'draft').length}
            </div>
            <div className="text-sm text-gray-500">Drafts</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-800">
              {lexiconItems.filter(item => item.status === 'submitted').length}
            </div>
            <div className="text-sm text-yellow-600">Awaiting Approval</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-800">
              {lexiconItems.filter(item => item.status === 'active').length}
            </div>
            <div className="text-sm text-green-600">Active</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-800">
              {lexiconItems.filter(item => item.status === 'archived').length}
            </div>
            <div className="text-sm text-red-600">Archived</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}