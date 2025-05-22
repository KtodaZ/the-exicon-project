import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              &copy; {new Date().getFullYear()} The Exicon Project. All rights reserved.
            </p>
          </div>
          <div className="flex gap-6">
            <Link 
              href="/exicon" 
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-red dark:hover:text-brand-red transition-colors"
            >
              Exicon
            </Link>
            <span className="text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed">
              Lexicon
            </span>
            <Link 
              href="/components" 
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Components
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}