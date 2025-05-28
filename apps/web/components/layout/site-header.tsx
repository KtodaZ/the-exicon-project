import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { authClient, useSession } from '@/lib/auth-client';
import { permissions } from '@/lib/admin-utils';
import Image from 'next/image';

export function SiteHeader() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check admin permissions
  useEffect(() => {
    if (!session?.user) {
      setCanAccessAdmin(false);
      return;
    }

    const checkAdminAccess = async () => {
      try {
        if (!permissions || typeof permissions.canListUsers !== 'function') {
          console.error('permissions.canListUsers is not a function:', permissions);
          setCanAccessAdmin(false);
          return;
        }
        const hasAccess = await permissions.canListUsers();
        setCanAccessAdmin(hasAccess);
      } catch (error) {
        console.error('Error checking admin access:', error);
        setCanAccessAdmin(false);
      }
    };

    checkAdminAccess();
  }, [session]);
  
  const isActive = (path: string) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <header className="border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900 whitespace-nowrap">The Exicon Project</Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`${
                  isActive('/') && router.pathname === '/'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Home
              </Link>
              <Link
                href="/exicon"
                className={`${
                  isActive('/exicon')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Exicon
              </Link>
              
              {/* Admin Link */}
              {!isPending && session?.user && canAccessAdmin && (
                <Link
                  href="/admin"
                  className={`${
                    isActive('/admin')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <span className="mr-1">⚙️</span>
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="flex items-center space-x-4">
              {!isClient || isPending ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : session?.user ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {/* User role indicator */}
                    {session.user && 'role' in session.user && (
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        session.user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        session.user.role === 'maintainer' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {session.user.role as string}
                      </span>
                    )}
                    
                    {session.user.image && (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {session.user.name}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/auth/sign-in')}
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => router.push('/auth/sign-up')}
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}