import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import Image from 'next/image';

export function SiteHeader() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const checkSession = async () => {
      try {
        const { data } = await authClient.getSession();
        setSession(data);
      } catch (error) {
        console.error('Session check failed:', error);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [isClient]);
  
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

  const handleGitHubSignIn = async () => {
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'github',
        callbackURL: '/exicon',
      });
    } catch (error) {
      console.error('GitHub sign in failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bayon text-[20px] text-gray-900 dark:text-white">
              The Exicon Project
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link 
                href="/exicon" 
                className={`text-sm font-medium transition-colors hover:text-brand-red ${
                  isActive('/exicon') 
                    ? 'text-brand-red' 
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Exicon
              </Link>
              <span className="text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed">
                Lexicon (Coming Soon)
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/components" 
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Components
            </Link>
            
            {/* Authentication UI */}
            <div className="flex items-center gap-2">
              {isLoading || !isClient ? (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ) : session?.user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Welcome, {session.user.name}!
                  </span>
                  {session.user.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGitHubSignIn}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'GitHub'}
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