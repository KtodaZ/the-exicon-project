import { authClient } from "./auth-client";

// Admin utility functions for managing users and permissions

/**
 * Check if current user has specific permissions
 */
export async function hasPermission(permissions: {
  exercise?: ("create" | "edit" | "view" | "delete" | "publish" | "submit" | "approve" | "view-all")[];
  lexicon?: ("create" | "edit" | "view" | "delete" | "publish" | "submit" | "approve" | "view-all")[];
  comment?: ("create" | "edit" | "delete" | "moderate")[];
  rating?: ("create" | "edit" | "delete")[];
  user?: ("create" | "list" | "ban" | "impersonate" | "delete" | "set-role" | "set-password")[];
  session?: ("list" | "delete")[];
}) {
  try {
    const result = await authClient.admin.hasPermission({
      permissions,
    });
    const actualResult = result as any;
    const evaluation = !!(actualResult?.data?.success && !actualResult?.data?.error);
    return evaluation;
  } catch (error) {
    console.error("[admin-utils] Error in hasPermission:", error);
    return false;
  }
}

/**
 * Check if a specific role has permissions (useful for UI logic)
 */
export async function checkRolePermission(
  role: "admin" | "maintainer" | "viewer",
  permissions: {
    exercise?: ("create" | "edit" | "view" | "delete" | "publish" | "submit" | "approve" | "view-all")[];
    lexicon?: ("create" | "edit" | "view" | "delete" | "publish" | "submit" | "approve" | "view-all")[];
    comment?: ("create" | "edit" | "delete" | "moderate")[];
    rating?: ("create" | "edit" | "delete")[];
    user?: ("create" | "list" | "ban" | "impersonate" | "delete" | "set-role" | "set-password")[];
    session?: ("list" | "delete")[];
  }
) {
  try {
    const result = await authClient.admin.checkRolePermission({
      role,
      permissions,
    });
    return (result as any)?.data?.hasPermission || false;
  } catch (error) {
    console.error("Error checking role permissions:", error);
    return false;
  }
}

/**
 * Admin functions - only for users with admin role
 */
export const adminActions = {
  /**
   * Create a new user with specified role
   */
  async createUser({
    name,
    email,
    password,
    role = "viewer",
    f3Name,
    f3Region,
  }: {
    name: string;
    email: string;
    password: string;
    role?: "admin" | "maintainer" | "viewer";
    f3Name?: string;
    f3Region?: string;
  }) {
    try {
      const result = await authClient.admin.createUser({
        name,
        email,
        password,
        role,
        data: {
          f3Name,
          f3Region,
        },
      });
      return { success: true, user: (result as any).data };
    } catch (error) {
      console.error("Error creating user:", error);
      return { success: false, error };
    }
  },

  /**
   * List all users with pagination
   */
  async listUsers({
    limit = 10,
    offset = 0,
    search,
    role,
  }: {
    limit?: number;
    offset?: number;
    search?: string;
    role?: "admin" | "maintainer" | "viewer";
  } = {}) {
    try {
      const query: any = { limit, offset };
      
      if (search) {
        query.searchField = "email";
        query.searchOperator = "contains";
        query.searchValue = search;
      }
      
      if (role) {
        query.filterField = "role";
        query.filterOperator = "eq";
        query.filterValue = role;
      }

      const result = await authClient.admin.listUsers({ query });
      return { success: true, ...(result as any).data };
    } catch (error) {
      console.error("Error listing users:", error);
      return { success: false, error };
    }
  },

  /**
   * Set user role
   */
  async setUserRole(userId: string, role: "admin" | "maintainer" | "viewer") {
    try {
      const result = await authClient.admin.setRole({
        userId,
        role,
      });
      return { success: true, user: (result as any).data };
    } catch (error) {
      console.error("Error setting user role:", error);
      return { success: false, error };
    }
  },

  /**
   * Ban a user
   */
  async banUser(userId: string, reason?: string, expiresIn?: number) {
    try {
      const result = await authClient.admin.banUser({
        userId,
        banReason: reason,
        banExpiresIn: expiresIn,
      });
      return { success: true, user: (result as any).data };
    } catch (error) {
      console.error("Error banning user:", error);
      return { success: false, error };
    }
  },

  /**
   * Unban a user
   */
  async unbanUser(userId: string) {
    try {
      const result = await authClient.admin.unbanUser({
        userId,
      });
      return { success: true, user: (result as any).data };
    } catch (error) {
      console.error("Error unbanning user:", error);
      return { success: false, error };
    }
  },

  /**
   * Impersonate a user (admin only)
   */
  async impersonateUser(userId: string) {
    try {
      const result = await authClient.admin.impersonateUser({
        userId,
      });
      return { success: true, session: (result as any).data };
    } catch (error) {
      console.error("Error impersonating user:", error);
      return { success: false, error };
    }
  },

  /**
   * Stop impersonating and return to admin account
   */
  async stopImpersonating() {
    try {
      await authClient.admin.stopImpersonating();
      return { success: true };
    } catch (error) {
      console.error("Error stopping impersonation:", error);
      return { success: false, error };
    }
  },
};

/**
 * Permission checking helpers for UI components
 */
export const permissions = {
  // Exercise permissions
  canCreateExercise: () => hasPermission({ exercise: ["create"] }),
  canEditExercise: () => hasPermission({ exercise: ["edit"] }),
  canDeleteExercise: () => hasPermission({ exercise: ["delete"] }),
  canPublishExercise: () => hasPermission({ exercise: ["publish"] }),
  canViewExercise: () => hasPermission({ exercise: ["view"] }),
  canSubmitExercise: () => hasPermission({ exercise: ["submit"] }),
  canApproveExercise: () => hasPermission({ exercise: ["approve"] }),
  canViewAllExercises: () => hasPermission({ exercise: ["view-all"] }),

  // Lexicon permissions
  canCreateLexicon: () => hasPermission({ lexicon: ["create"] }),
  canEditLexicon: () => hasPermission({ lexicon: ["edit"] }),
  canDeleteLexicon: () => hasPermission({ lexicon: ["delete"] }),
  canPublishLexicon: () => hasPermission({ lexicon: ["publish"] }),
  canViewLexicon: () => hasPermission({ lexicon: ["view"] }),
  canSubmitLexicon: () => hasPermission({ lexicon: ["submit"] }),
  canApproveLexicon: () => hasPermission({ lexicon: ["approve"] }),
  canViewAllLexicon: () => hasPermission({ lexicon: ["view-all"] }),

  // Comment permissions
  canCreateComment: () => hasPermission({ comment: ["create"] }),
  canEditComment: () => hasPermission({ comment: ["edit"] }),
  canDeleteComment: () => hasPermission({ comment: ["delete"] }),
  canModerateComments: () => hasPermission({ comment: ["moderate"] }),

  // Rating permissions
  canCreateRating: () => hasPermission({ rating: ["create"] }),
  canEditRating: () => hasPermission({ rating: ["edit"] }),
  canDeleteRating: () => hasPermission({ rating: ["delete"] }),

  // User management permissions
  canListUsers: () => hasPermission({ user: ["list"] }),
  canCreateUser: () => hasPermission({ user: ["create"] }),
  canSetUserRole: () => hasPermission({ user: ["set-role"] }),
  canBanUser: () => hasPermission({ user: ["ban"] }),
  canImpersonateUser: () => hasPermission({ user: ["impersonate"] }),
  canDeleteUser: () => hasPermission({ user: ["delete"] }),
}; 