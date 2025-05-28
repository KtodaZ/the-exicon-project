import React, { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { adminActions, permissions } from '@/lib/admin-utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'maintainer' | 'viewer';
  banned?: boolean;
  banReason?: string;
  createdAt: string;
  f3Name?: string;
  f3Region?: string;
}

export function AdminDashboard() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions_check, setPermissionsCheck] = useState({
    canListUsers: false,
    canCreateUser: false,
    canSetRole: false,
    canBanUser: false,
    canImpersonate: false,
  });

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const [canListUsers, canCreateUser, canSetRole, canBanUser, canImpersonate] = await Promise.all([
        permissions.canListUsers(),
        permissions.canCreateUser(),
        permissions.canSetUserRole(),
        permissions.canBanUser(),
        permissions.canImpersonateUser(),
      ]);

      setPermissionsCheck({
        canListUsers,
        canCreateUser,
        canSetRole,
        canBanUser,
        canImpersonate,
      });
    };

    checkPermissions();
  }, []);

  // Load users if user has permission
  useEffect(() => {
    const loadUsers = async () => {
      if (!permissions_check.canListUsers) return;
      
      setLoading(true);
      const result = await adminActions.listUsers({ limit: 50 });
      if (result.success && 'users' in result) {
        setUsers(result.users || []);
      }
      setLoading(false);
    };

    loadUsers();
  }, [permissions_check.canListUsers]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'maintainer' | 'viewer') => {
    if (!permissions_check.canSetRole) return;
    
    const result = await adminActions.setUserRole(userId, newRole);
    if (result.success) {
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    }
  };

  const handleBanUser = async (userId: string, reason: string) => {
    if (!permissions_check.canBanUser) return;
    
    const result = await adminActions.banUser(userId, reason);
    if (result.success) {
      setUsers(users.map(user => 
        user.id === userId ? { ...user, banned: true, banReason: reason } : user
      ));
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!permissions_check.canBanUser) return;
    
    const result = await adminActions.unbanUser(userId);
    if (result.success) {
      setUsers(users.map(user => 
        user.id === userId ? { ...user, banned: false, banReason: undefined } : user
      ));
    }
  };

  const handleImpersonate = async (userId: string) => {
    if (!permissions_check.canImpersonate) return;
    
    const result = await adminActions.impersonateUser(userId);
    if (result.success) {
      // Refresh the page to show the impersonated session
      window.location.reload();
    }
  };

  // Show access denied if user doesn't have list permission
  if (!permissions_check.canListUsers) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Access denied. You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="text-sm text-gray-600">
          Logged in as: <span className="font-semibold">{session?.user?.name}</span> 
          {session?.user && 'role' in session.user && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              {session.user.role as string}
            </span>
          )}
        </div>
      </div>

      {/* Permission Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Your Permissions:</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div className={permissions_check.canListUsers ? 'text-green-600' : 'text-red-600'}>
            📋 List Users: {permissions_check.canListUsers ? '✓' : '✗'}
          </div>
          <div className={permissions_check.canCreateUser ? 'text-green-600' : 'text-red-600'}>
            ➕ Create User: {permissions_check.canCreateUser ? '✓' : '✗'}
          </div>
          <div className={permissions_check.canSetRole ? 'text-green-600' : 'text-red-600'}>
            👑 Set Roles: {permissions_check.canSetRole ? '✓' : '✗'}
          </div>
          <div className={permissions_check.canBanUser ? 'text-green-600' : 'text-red-600'}>
            🚫 Ban Users: {permissions_check.canBanUser ? '✓' : '✗'}
          </div>
          <div className={permissions_check.canImpersonate ? 'text-green-600' : 'text-red-600'}>
            👤 Impersonate: {permissions_check.canImpersonate ? '✓' : '✗'}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Users</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">F3 Info</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {permissions_check.canSetRole ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'maintainer' | 'viewer')}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="maintainer">Maintainer</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'maintainer' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {user.f3Name && (
                        <div>
                          <div>Name: {user.f3Name}</div>
                          {user.f3Region && <div>Region: {user.f3Region}</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {user.banned ? (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                          Banned
                          {user.banReason && <div className="text-xs">Reason: {user.banReason}</div>}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        {permissions_check.canBanUser && (
                          <>
                            {user.banned ? (
                              <button
                                onClick={() => handleUnbanUser(user.id)}
                                className="text-green-600 hover:text-green-900 text-sm"
                              >
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const reason = prompt('Ban reason:');
                                  if (reason) handleBanUser(user.id, reason);
                                }}
                                className="text-red-600 hover:text-red-900 text-sm"
                              >
                                Ban
                              </button>
                            )}
                          </>
                        )}
                        {permissions_check.canImpersonate && user.id !== session?.user?.id && (
                          <button
                            onClick={() => handleImpersonate(user.id)}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Impersonate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 