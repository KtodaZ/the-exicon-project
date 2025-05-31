import React, { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { adminActions } from '@/lib/admin-utils';
import { ExerciseManagement } from './exercise-management';
import { LexiconManagement } from './lexicon-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Plus, Crown, Ban, User, Dumbbell, BookOpen, Users } from 'lucide-react';

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
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'exercises' | 'lexicon'>('users');
  const [pendingCounts, setPendingCounts] = useState({ exercises: 0, lexicon: 0 });

  // Load users if user has permission
  useEffect(() => {
    const loadUsers = async () => {
      if (!permissions?.canListUsers) return;
      
      setLoading(true);
      const result = await adminActions.listUsers({ limit: 50 });
      if (result.success && 'users' in result) {
        setUsers(result.users || []);
      }
      setLoading(false);
    };

    loadUsers();
  }, [permissions?.canListUsers]);

  // Load pending approval counts
  useEffect(() => {
    const loadPendingCounts = async () => {
      console.log('Loading pending counts...');
      console.log('Can view exercises:', permissions?.canViewAllExercises);
      console.log('Can view lexicon:', permissions?.canViewAllLexicon);
      
      if (!permissions?.canViewAllExercises && !permissions?.canViewAllLexicon) {
        console.log('No permissions to view counts');
        return;
      }
      
      try {
        const [exerciseResponse, lexiconResponse] = await Promise.all([
          permissions?.canViewAllExercises 
            ? fetch('/api/exercises/manage?status=submitted&limit=1').then(r => r.json())
            : Promise.resolve({ total: 0 }),
          permissions?.canViewAllLexicon 
            ? fetch('/api/lexicon/manage?status=submitted&limit=1').then(r => r.json())
            : Promise.resolve({ total: 0 })
        ]);
        
        console.log('Exercise response:', exerciseResponse);
        console.log('Lexicon response:', lexiconResponse);
        
        setPendingCounts({
          exercises: exerciseResponse.total || 0,
          lexicon: lexiconResponse.total || 0
        });
      } catch (error) {
        console.error('Error loading pending counts:', error);
      }
    };

    loadPendingCounts();
  }, [permissions?.canViewAllExercises, permissions?.canViewAllLexicon]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'maintainer' | 'viewer') => {
    if (!permissions?.canSetUserRole) return;
    
    const result = await adminActions.setUserRole(userId, newRole);
    if (result.success) {
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    }
  };

  const handleBanUser = async (userId: string, reason: string) => {
    if (!permissions?.canBanUser) return;
    
    const result = await adminActions.banUser(userId, reason);
    if (result.success) {
      setUsers(users.map(user => 
        user.id === userId ? { ...user, banned: true, banReason: reason } : user
      ));
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!permissions?.canBanUser) return;
    
    const result = await adminActions.unbanUser(userId);
    if (result.success) {
      setUsers(users.map(user => 
        user.id === userId ? { ...user, banned: false, banReason: undefined } : user
      ));
    }
  };

  const handleImpersonate = async (userId: string) => {
    if (!permissions?.canImpersonateUser) return;
    
    const result = await adminActions.impersonateUser(userId);
    if (result.success) {
      // Refresh the page to show the impersonated session
      window.location.reload();
    }
  };

  // Show access denied if user doesn't have list permission
  if (!permissions?.canListUsers) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-red-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
                  <p className="text-gray-600">You don&apos;t have permission to access the admin panel.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Manage users, permissions, exercise content, and lexicon items.
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Logged in as: <span className="font-semibold">{session?.user?.name}</span> 
              {session?.user && 'role' in session.user && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {session.user.role as string}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('users')}
                className={`${
                  activeTab === 'users'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <Users className="h-4 w-4" />
                User Management
              </button>
              <button
                onClick={() => setActiveTab('exercises')}
                className={`${
                  activeTab === 'exercises'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 relative`}
              >
                <Dumbbell className="h-4 w-4" />
                Exercise Management
                {pendingCounts.exercises > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {pendingCounts.exercises > 99 ? '99+' : pendingCounts.exercises}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('lexicon')}
                className={`${
                  activeTab === 'lexicon'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 relative`}
              >
                <BookOpen className="h-4 w-4" />
                Lexicon Management
                {pendingCounts.lexicon > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {pendingCounts.lexicon > 99 ? '99+' : pendingCounts.lexicon}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <>
            {/* Permission Summary Card */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Your Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className={`flex items-center space-x-2 ${permissions?.canListUsers ? 'text-green-600' : 'text-red-600'}`}>
                    <ClipboardList className="h-4 w-4" />
                    <span className="text-sm">
                      List Users: {permissions?.canListUsers ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className={`flex items-center space-x-2 ${permissions?.canCreateUser ? 'text-green-600' : 'text-red-600'}`}>
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">
                      Create User: {permissions?.canCreateUser ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className={`flex items-center space-x-2 ${permissions?.canSetUserRole ? 'text-green-600' : 'text-red-600'}`}>
                    <Crown className="h-4 w-4" />
                    <span className="text-sm">
                      Set Roles: {permissions?.canSetUserRole ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className={`flex items-center space-x-2 ${permissions?.canBanUser ? 'text-green-600' : 'text-red-600'}`}>
                    <Ban className="h-4 w-4" />
                    <span className="text-sm">
                      Ban Users: {permissions?.canBanUser ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className={`flex items-center space-x-2 ${permissions?.canImpersonateUser ? 'text-green-600' : 'text-red-600'}`}>
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      Impersonate: {permissions?.canImpersonateUser ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Management Card */}
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading users...</p>
                  </div>
                ) : (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">F3 Info</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {permissions?.canSetUserRole ? (
                                <select
                                  value={user.role}
                                  onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'maintainer' | 'viewer')}
                                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {user.f3Name && (
                                <div>
                                  <div>Name: {user.f3Name}</div>
                                  {user.f3Region && <div>Region: {user.f3Region}</div>}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {user?.banned ? (
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
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                {permissions?.canBanUser && (
                                  <>
                                    {user?.banned ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleUnbanUser(user.id)}
                                        className="text-green-600 hover:text-green-700"
                                      >
                                        Unban
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                          const reason = prompt('Ban reason:');
                                          if (reason) handleBanUser(user.id, reason);
                                        }}
                                      >
                                        Ban
                                      </Button>
                                    )}
                                  </>
                                )}
                                {permissions?.canImpersonateUser && user.id !== session?.user?.id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleImpersonate(user.id)}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    Impersonate
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
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'exercises' && <ExerciseManagement />}

        {activeTab === 'lexicon' && <LexiconManagement />}
      </div>
    </div>
  );
} 