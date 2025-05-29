import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import { permissions } from '@/lib/admin-utils';

export interface UserPermissions {
  // Exercise permissions
  canCreateExercise: boolean;
  canEditExercise: boolean;
  canDeleteExercise: boolean;
  canPublishExercise: boolean;
  canViewExercise: boolean;
  canSubmitExercise: boolean;
  canApproveExercise: boolean;
  canViewAllExercises: boolean;

  // Comment permissions
  canCreateComment: boolean;
  canEditComment: boolean;
  canDeleteComment: boolean;
  canModerateComments: boolean;

  // Rating permissions
  canCreateRating: boolean;
  canEditRating: boolean;
  canDeleteRating: boolean;

  // User management permissions
  canListUsers: boolean;
  canCreateUser: boolean;
  canSetUserRole: boolean;
  canBanUser: boolean;
  canImpersonateUser: boolean;
  canDeleteUser: boolean;
}

async function fetchUserPermissions(): Promise<UserPermissions> {
  const [
    // Exercise permissions
    canCreateExercise,
    canEditExercise,
    canDeleteExercise,
    canPublishExercise,
    canViewExercise,
    canSubmitExercise,
    canApproveExercise,
    canViewAllExercises,

    // Comment permissions
    canCreateComment,
    canEditComment,
    canDeleteComment,
    canModerateComments,

    // Rating permissions
    canCreateRating,
    canEditRating,
    canDeleteRating,

    // User management permissions
    canListUsers,
    canCreateUser,
    canSetUserRole,
    canBanUser,
    canImpersonateUser,
    canDeleteUser,
  ] = await Promise.all([
    // Exercise permissions
    permissions.canCreateExercise(),
    permissions.canEditExercise(),
    permissions.canDeleteExercise(),
    permissions.canPublishExercise(),
    permissions.canViewExercise(),
    permissions.canSubmitExercise(),
    permissions.canApproveExercise(),
    permissions.canViewAllExercises(),

    // Comment permissions
    permissions.canCreateComment(),
    permissions.canEditComment(),
    permissions.canDeleteComment(),
    permissions.canModerateComments(),

    // Rating permissions
    permissions.canCreateRating(),
    permissions.canEditRating(),
    permissions.canDeleteRating(),

    // User management permissions
    permissions.canListUsers(),
    permissions.canCreateUser(),
    permissions.canSetUserRole(),
    permissions.canBanUser(),
    permissions.canImpersonateUser(),
    permissions.canDeleteUser(),
  ]);

  return {
    // Exercise permissions
    canCreateExercise,
    canEditExercise,
    canDeleteExercise,
    canPublishExercise,
    canViewExercise,
    canSubmitExercise,
    canApproveExercise,
    canViewAllExercises,

    // Comment permissions
    canCreateComment,
    canEditComment,
    canDeleteComment,
    canModerateComments,

    // Rating permissions
    canCreateRating,
    canEditRating,
    canDeleteRating,

    // User management permissions
    canListUsers,
    canCreateUser,
    canSetUserRole,
    canBanUser,
    canImpersonateUser,
    canDeleteUser,
  };
}

export function usePermissions() {
  const { data: session, isPending: sessionPending } = useSession();
  
  return useQuery({
    queryKey: ['permissions', session?.user?.id],
    queryFn: fetchUserPermissions,
    enabled: !!session?.user && !sessionPending,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

// Convenience hook for specific permission checks
export function useHasPermission(permission: keyof UserPermissions) {
  const { data: permissions, isLoading } = usePermissions();
  
  return {
    hasPermission: permissions?.[permission] ?? false,
    isLoading,
  };
} 