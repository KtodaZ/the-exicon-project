import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { authClient, useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import Image from 'next/image';
import { FileTextIcon, SettingsIcon, ChevronDownIcon } from 'lucide-react';
import { ExpandableSearch } from '@/components/ui/expandable-search';

export function SiteHeader() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { data: permissions } = usePermissions();
  const [isClient, setIsClient] = useState(false);
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(event.target as Node)) {
        setIsDesktopDropdownOpen(false);
      }
    }

    if (isDesktopDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDesktopDropdownOpen]);

  // Close mobile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target as Node)) {
        setIsMobileDropdownOpen(false);
      }
    }

    if (isMobileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMobileDropdownOpen]);

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
              <Link href="/" className="flex items-center space-x-3">
                <Image
                  src="/f3-logo.webp"
                  alt="F3 Logo"
                  width={32}
                  height={32}
                  className="flex-shrink-0"
                />
                <span className="text-xl font-bold text-gray-900 whitespace-nowrap" style={{ fontFamily: 'var(--font-logo)' }}>The Exicon Project</span>
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`${isActive('/') && router.pathname === '/'
                  ? 'border-indigo-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Home
              </Link>
              <Link
                href="/exicon"
                className={`${isActive('/exicon')
                  ? 'border-indigo-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Exicon
              </Link>
              <Link
                href="/lexicon"
                className={`${isActive('/lexicon')
                  ? 'border-indigo-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Lexicon
              </Link>
            </nav>
          </div>

          {/* Desktop menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="flex items-center space-x-4">
              {/* Search - always visible */}
              <ExpandableSearch placeholder="Search F3 terms and exercises..." />

              {!isClient || isPending ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : session?.user ? (
                <div className="relative" ref={desktopDropdownRef}>
                  <button
                    onClick={() => setIsDesktopDropdownOpen(!isDesktopDropdownOpen)}
                    className="flex items-center space-x-2 text-gray-900 hover:text-gray-700 focus:outline-none"
                  >
                    {session.user.image && (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium">
                      {session.user.f3Name && session.user.f3Region
                        ? `${session.user.f3Name} (${session.user.f3Region})`
                        : session.user.f3Name || session.user.name
                      }
                    </span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>

                  {isDesktopDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <Link
                          href="/my-submissions"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsDesktopDropdownOpen(false)}
                        >
                          <FileTextIcon className="mr-3 h-4 w-4" />
                          My Submissions
                        </Link>

                        {permissions?.canListUsers && (
                          <Link
                            href="/admin"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsDesktopDropdownOpen(false)}
                          >
                            <SettingsIcon className="mr-3 h-4 w-4" />
                            Admin
                          </Link>
                        )}

                        <div className="border-t border-gray-100">
                          <button
                            onClick={() => {
                              setIsDesktopDropdownOpen(false);
                              handleSignOut();
                            }}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) :
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
              }
            </div>
          </div>

          {/* Mobile menu */}
          <div className="sm:hidden flex items-center space-x-3">
            {/* Search - always visible */}
            <ExpandableSearch placeholder="Search F3 terms and exercises..." />

            {!isClient || isPending ? (
              <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full"></div>
            ) : session?.user ? (
              <div className="relative" ref={mobileDropdownRef}>
                <button
                  onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
                  className="flex items-center text-gray-900 hover:text-gray-700 focus:outline-none"
                >
                  {session.user.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <ChevronDownIcon className="h-4 w-4 ml-1" />
                </button>

                {isMobileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link
                        href="/my-submissions"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsMobileDropdownOpen(false)}
                      >
                        <FileTextIcon className="mr-3 h-4 w-4" />
                        My Submissions
                      </Link>

                      {permissions?.canListUsers && (
                        <Link
                          href="/admin"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsMobileDropdownOpen(false)}
                        >
                          <SettingsIcon className="mr-3 h-4 w-4" />
                          Admin
                        </Link>
                      )}

                      <div className="border-t border-gray-100">
                        <button
                          onClick={() => {
                            setIsMobileDropdownOpen(false);
                            handleSignOut();
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}