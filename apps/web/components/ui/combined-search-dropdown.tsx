import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Dumbbell, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { CombinedSearchResult } from '@/types/search';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface CombinedSearchDropdownProps {
  searchQuery: string;
  onResultClick?: () => void;
  className?: string;
}

export function CombinedSearchDropdown({ 
  searchQuery, 
  onResultClick,
  className = '' 
}: CombinedSearchDropdownProps) {
  const [results, setResults] = useState<CombinedSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLexiconCollapsed, setIsLexiconCollapsed] = useState(false);
  const [isExercisesCollapsed, setIsExercisesCollapsed] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    const searchCombined = async (query: string) => {
      if (!query.trim()) {
        setResults(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/search/combined?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data: CombinedSearchResult = await response.json();
        setResults(data);
      } catch (err) {
        setError('Failed to search');
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    };

    searchCombined(debouncedQuery);
  }, [debouncedQuery]);

  if (!searchQuery.trim()) {
    return null;
  }

  const hasResults = results && (results.lexicon.items.length > 0 || results.exercises.items.length > 0);

  return (
    <div className={`absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[28rem] overflow-y-auto overscroll-contain ${className}`}
         style={{ 
           WebkitOverflowScrolling: 'touch',
           touchAction: 'pan-y'
         }}>
      {isLoading && (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <Search className="h-4 w-4 animate-spin mx-auto mb-2" />
          Searching...
        </div>
      )}

      {error && (
        <div className="p-4 text-center text-red-500">
          {error}
        </div>
      )}

      {!isLoading && !error && !hasResults && (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          No results found for &quot;{searchQuery}&quot;
        </div>
      )}

      {!isLoading && !error && hasResults && (
        <>
          {/* Exercise Results - Now First */}
          {results.exercises.items.length > 0 && (
            <div className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsExercisesCollapsed(!isExercisesCollapsed)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-brand-red" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Exercises ({results.exercises.totalCount > 4 ? 'Max' : results.exercises.items.length})
                  </span>
                </div>
                {isExercisesCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                )}
              </button>
              {!isExercisesCollapsed && (
                <>
                  {results.exercises.items.slice(0, 4).map((item: any) => (
                    <Link
                      key={item._id}
                      href={`/exicon/${item.slug}`}
                      onClick={onResultClick}
                      className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {item.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {item.description.length > 100 
                              ? item.description.substring(0, 100) + '...'
                              : item.description
                            }
                          </p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-gray-400 ml-2 flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                  <Link
                    href={`/exicon?query=${encodeURIComponent(searchQuery)}`}
                    onClick={onResultClick}
                    className="block py-2 px-3 text-center text-xs text-brand-red hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
                  >
                    See all exercise results →
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Lexicon Results - Now Second */}
          {results.lexicon.items.length > 0 && (
            <div>
              <button
                onClick={() => setIsLexiconCollapsed(!isLexiconCollapsed)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-brand-red" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    F3 Lexicon ({results.lexicon.totalCount > 4 ? 'Max' : results.lexicon.items.length})
                  </span>
                </div>
                {isLexiconCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                )}
              </button>
              {!isLexiconCollapsed && (
                <>
                  {results.lexicon.items.slice(0, 4).map((item: any) => (
                    <Link
                      key={item._id}
                      href={`/lexicon/${item.urlSlug}`}
                      onClick={onResultClick}
                      className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {item.title}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {item.description.length > 100 
                              ? item.description.substring(0, 100) + '...'
                              : item.description
                            }
                          </p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-gray-400 ml-2 flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                  <Link
                    href={`/lexicon?query=${encodeURIComponent(searchQuery)}`}
                    onClick={onResultClick}
                    className="block py-2 px-3 text-center text-xs text-brand-red hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
                  >
                    See all lexicon results →
                  </Link>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CombinedSearchDropdown; 