import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { permissions } from '@/lib/admin-utils';
import { useSession } from '@/lib/auth-client';
// @ts-ignore - Known lucide-react barrel optimization issue in Turborepo
import { Plus, Edit, Trash2, MessageSquare, Star, Shield } from 'lucide-react';

interface ExerciseActionsProps {
  exerciseId?: string;
  className?: string;
}

export function ExerciseActions({ exerciseId, className }: ExerciseActionsProps) {
  const { data: session } = useSession();
  const [userPermissions, setUserPermissions] = useState({
    // Exercise permissions
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canPublish: false,
    canView: false,
    
    // Comment permissions
    canComment: false,
    canModerateComments: false,
    
    // Rating permissions
    canRate: false,
    
    // Admin permissions
    canManageUsers: false,
  });

  useEffect(() => {
    const checkAllPermissions = async () => {
      if (!session?.user) {
        setUserPermissions({
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canPublish: false,
          canView: true, // Public viewing
          canComment: false,
          canModerateComments: false,
          canRate: false,
          canManageUsers: false,
        });
        return;
      }

      // Check all permissions in parallel
      const [
        canCreate,
        canEdit,
        canDelete,
        canPublish,
        canView,
        canComment,
        canModerateComments,
        canRate,
        canManageUsers,
      ] = await Promise.all([
        permissions.canCreateExercise(),
        permissions.canEditExercise(),
        permissions.canDeleteExercise(),
        permissions.canPublishExercise(),
        permissions.canViewExercise(),
        permissions.canCreateComment(),
        permissions.canModerateComments(),
        permissions.canCreateRating(),
        permissions.canListUsers(),
      ]);

      setUserPermissions({
        canCreate,
        canEdit,
        canDelete,
        canPublish,
        canView,
        canComment,
        canModerateComments,
        canRate,
        canManageUsers,
      });
    };

    checkAllPermissions();
  }, [session]);

  // Helper function to get user role display
  const getUserRoleInfo = () => {
    if (!session?.user || !('role' in session.user)) {
      return { role: 'Guest', color: 'bg-gray-100 text-gray-800' };
    }

    const role = session.user.role as string;
    switch (role) {
      case 'admin':
        return { role: 'Admin', color: 'bg-red-100 text-red-800' };
      case 'maintainer':
        return { role: 'Maintainer', color: 'bg-yellow-100 text-yellow-800' };
      case 'viewer':
        return { role: 'Viewer', color: 'bg-green-100 text-green-800' };
      default:
        return { role: role, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const roleInfo = getUserRoleInfo();

  const handleAction = (action: string) => {
    console.log(`${action} action triggered for exercise:`, exerciseId);
    // In a real app, you'd implement the actual action logic here
    alert(`${action} action would be performed here!`);
  };

  return (
    <div className={`space-y-6 p-6 bg-white rounded-lg border ${className}`}>
      {/* User Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Exercise Actions</h3>
          <p className="text-sm text-gray-600">
            {session?.user ? `Logged in as ${session.user.name}` : 'Not logged in'}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleInfo.color}`}>
          {roleInfo.role}
        </span>
      </div>

      {/* Exercise Management Actions */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Exercise Management</h4>
        <div className="flex flex-wrap gap-2">
          {userPermissions.canCreate && (
            <Button
              size="sm"
              onClick={() => handleAction('Create Exercise')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Exercise
            </Button>
          )}
          
          {userPermissions.canEdit && exerciseId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('Edit Exercise')}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
          
          {userPermissions.canDelete && exerciseId && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleAction('Delete Exercise')}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Comment & Rating Actions */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Interaction</h4>
        <div className="flex flex-wrap gap-2">
          {userPermissions.canComment && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('Add Comment')}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Comment
            </Button>
          )}
          
          {userPermissions.canRate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('Rate Exercise')}
              className="flex items-center gap-2"
            >
              <Star className="h-4 w-4" />
              Rate
            </Button>
          )}
          
          {userPermissions.canModerateComments && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('Moderate Comments')}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Moderate
            </Button>
          )}
        </div>
      </div>

      {/* Permission Summary */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Your Permissions</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className={`p-2 rounded ${userPermissions.canView ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            View Exercises: {userPermissions.canView ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded ${userPermissions.canCreate ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            Create Exercises: {userPermissions.canCreate ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded ${userPermissions.canEdit ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            Edit Exercises: {userPermissions.canEdit ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded ${userPermissions.canDelete ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            Delete Exercises: {userPermissions.canDelete ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded ${userPermissions.canComment ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            Comment: {userPermissions.canComment ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded ${userPermissions.canRate ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            Rate: {userPermissions.canRate ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded ${userPermissions.canModerateComments ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            Moderate: {userPermissions.canModerateComments ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded ${userPermissions.canManageUsers ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            Admin Panel: {userPermissions.canManageUsers ? '✓' : '✗'}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 border-t pt-3">
        <p>🔒 <strong>Permission Levels:</strong></p>
        <ul className="mt-1 space-y-1">
          <li>• <span className="text-red-600">Admin</span>: Full access to all features</li>
          <li>• <span className="text-yellow-600">Maintainer</span>: Can create/edit exercises and moderate comments</li>
          <li>• <span className="text-green-600">Viewer</span>: Can view, comment, and rate exercises</li>
        </ul>
      </div>
    </div>
  );
} 