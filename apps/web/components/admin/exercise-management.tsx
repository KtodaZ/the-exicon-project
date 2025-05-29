import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { ExerciseListItem, ExerciseStatus } from '@/lib/models/exercise';
import { toast } from 'sonner';

interface ExerciseManagementProps {
  className?: string;
}

export function ExerciseManagement({ className }: ExerciseManagementProps) {
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ExerciseStatus | 'all'>('all');

  // Load exercises from API
  useEffect(() => {
    const loadExercises = async () => {
      if (!permissions?.canViewAllExercises) return;
      
      setLoading(true);
      
      try {
        const response = await fetch(`/api/exercises/manage?status=${statusFilter}&limit=50`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setExercises(data.exercises || []);
        } else {
          console.error('Failed to load exercises:', data.error);
          setExercises([]);
        }
      } catch (error) {
        console.error('Error loading exercises:', error);
        setExercises([]);
      } finally {
        setLoading(false);
      }
    };

    loadExercises();
  }, [permissions?.canViewAllExercises, statusFilter]);

  const handleStatusChange = async (exerciseId: string, newStatus: ExerciseStatus) => {
    if (!permissions?.canApproveExercise && !permissions?.canEditExercise) return;

    try {
      const response = await fetch('/api/exercises/manage', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exerciseId,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update exercise status');
      }
      
      // Update local state
      setExercises(prev => 
        prev.map(exercise => 
          exercise._id === exerciseId 
            ? { ...exercise, status: newStatus }
            : exercise
        )
      );
      
      toast.success(data.message || `Exercise status changed to ${newStatus}`);
    } catch (error) {
      console.error('Error changing exercise status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to change exercise status');
    }
  };

  const filteredExercises = statusFilter === 'all' 
    ? exercises 
    : exercises.filter(exercise => exercise.status === statusFilter);

  if (!permissions?.canViewAllExercises) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Exercise Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-red-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You don&apos;t have permission to view exercise management.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Exercise Management</CardTitle>
          
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
              Filter by status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ExerciseStatus | 'all')}
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
            <p className="mt-2 text-gray-600">Loading exercises...</p>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No exercises found</h3>
            <p className="text-gray-600">
              No exercises found for status: {statusFilter}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exercise
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
                {filteredExercises.map((exercise) => (
                  <tr key={exercise._id}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{exercise.name}</div>
                        <div className="text-sm text-gray-500 line-clamp-2">{exercise.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={exercise.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {exercise.submittedBy || 'System'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {exercise.submittedAt 
                        ? new Date(exercise.submittedAt).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {permissions?.canApproveExercise && exercise.status === 'submitted' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(exercise._id, 'active')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(exercise._id, 'draft')}
                            >
                              Return to Draft
                            </Button>
                          </>
                        )}
                        
                        {permissions?.canEditExercise && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              window.location.href = `/edit-exercise/${exercise._id}`;
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        
                        {permissions?.canApproveExercise && exercise.status === 'active' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusChange(exercise._id, 'archived')}
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
              {exercises.filter(e => e.status === 'draft').length}
            </div>
            <div className="text-sm text-gray-500">Drafts</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-800">
              {exercises.filter(e => e.status === 'submitted').length}
            </div>
            <div className="text-sm text-yellow-600">Awaiting Approval</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-800">
              {exercises.filter(e => e.status === 'active').length}
            </div>
            <div className="text-sm text-green-600">Active</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-800">
              {exercises.filter(e => e.status === 'archived').length}
            </div>
            <div className="text-sm text-red-600">Archived</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 