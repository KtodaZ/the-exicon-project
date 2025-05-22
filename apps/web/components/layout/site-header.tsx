import Link from 'next/link';
import { useRouter } from 'next/router';

export function SiteHeader() {
  const router = useRouter();
  
  const isActive = (path: string) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  return (
    <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-xl text-gray-900 dark:text-white">
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
          </div>
        </div>
      </div>
    </header>
  );
}