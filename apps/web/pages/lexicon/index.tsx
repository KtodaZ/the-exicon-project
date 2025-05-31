import { useState, useEffect, useRef } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/ui/searchbar';
import { LexiconCard } from '@/components/lexicon-card';
import { MasonryLayout } from '@/components/masonry-layout';
import { AlphabetNav } from '@/components/alphabet-nav';
import { Spinner } from '@/components/ui/spinner';
import { LexiconListItem, getAllLexiconItems, getLexiconItemsByLetter } from '@/lib/api/lexicon';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { BookOpen, Search, Copy, Plus } from 'lucide-react';
import LexiconCSVDownloadButton from '@/components/ui/lexicon-csv-download-button';

interface LexiconPageProps {
  initialItems: LexiconListItem[];
  totalCount: number;
  itemsByLetter: { [letter: string]: LexiconListItem[] };
  initialQuery: string;
  initialPage: number;
}

// Fetch function for TanStack Query
const fetchLexiconItems = async ({ pageParam = 1, queryKey }: any) => {
  const [, searchQuery] = queryKey;
  const queryParams = new URLSearchParams();
  queryParams.append('page', pageParam.toString());
  queryParams.append('limit', '24');

  if (searchQuery) {
    queryParams.append('query', searchQuery);
  }

  const response = await fetch(`/api/lexicon?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch lexicon items');
  }

  return response.json();
};

export default function LexiconPage({
  initialItems,
  totalCount,
  itemsByLetter,
  initialQuery,
  initialPage
}: LexiconPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: permissions } = usePermissions();
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [activeLetter, setActiveLetter] = useState<string | undefined>();
  const [displayItems, setDisplayItems] = useState<LexiconListItem[]>(initialItems);
  const [isScrolled, setIsScrolled] = useState(false);

  // Debounce the search input
  const searchQuery = useDebounce(searchInput, 300);

  // Store the truly initial data from SSR in refs
  const initialItemsRef = useRef(initialItems);
  const initialTotalCountRef = useRef(totalCount);
  const initialPageRef = useRef(initialPage);

  // Available letters for navigation
  const availableLetters = Object.keys(itemsByLetter).sort();

  // Scroll detection for minified view
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY > 150;
          setIsScrolled(scrolled);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle alphabet filtering
  const handleLetterClick = (letter: string) => {
    setActiveLetter(letter);
    setSearchInput(''); // Clear search when filtering by letter
    const letterItems = itemsByLetter[letter] || [];
    setDisplayItems(letterItems);
  };

  const handleShowAll = () => {
    setActiveLetter(undefined);
    setSearchInput(''); // Clear search
    setDisplayItems(initialItems);
  };

  // Update URL when search changes
  useEffect(() => {
    if (!router.isReady || router.pathname !== '/lexicon') {
      return;
    }

    const newQuery: any = {};
    if (searchQuery) {
      newQuery.query = searchQuery;
    }

    // Only update URL if different from current
    const currentQuery = router.query.query as string || '';
    if (searchQuery !== currentQuery) {
      router.push(
        {
          pathname: '/lexicon',
          query: newQuery,
        },
        undefined,
        { shallow: true }
      );
    }
  }, [searchQuery, router.isReady, router.pathname, router.query, router]);

  // Use the custom infinite scroll hook for search AND default view
  const isInitialQuery = searchQuery === initialQuery && !activeLetter;

  const {
    data,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
  } = useInfiniteScroll<LexiconListItem>({
    queryKey: ['lexicon', searchQuery],
    fetchFn: fetchLexiconItems,
    initialData: isInitialQuery ? {
      pages: [{ items: initialItemsRef.current, totalCount: initialTotalCountRef.current }],
      pageParams: [initialPageRef.current],
    } : undefined,
    initialPageParam: 1,
  });

  // Determine what items to show
  let itemsToShow: LexiconListItem[] = [];
  let currentTotalCount = totalCount;

  if (activeLetter) {
    // Show filtered by letter
    itemsToShow = displayItems;
    currentTotalCount = displayItems.length;
  } else {
    // Show search results OR default view with infinite scroll
    itemsToShow = data?.pages.flatMap((page: { items: LexiconListItem[]; totalCount: number }) => page.items) ?? displayItems;
    currentTotalCount = data?.pages[0]?.totalCount ?? totalCount;
  }

  const handleCopyDefinition = (title: string, description: string) => {
    console.log(`Copied definition for ${title}`);
  };

  if (isError && searchQuery) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error loading lexicon</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Lexicon - F3 Terminology Guide</title>
        <meta name="description" content="Comprehensive guide to F3 terminology and definitions" />
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-black">
        <div className="container mx-auto py-6">
          {/* Header */}
          <div className="mb-6 pt-4">
            {/* Mobile Layout */}
            <div className="block lg:hidden text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <BookOpen className="h-6 w-6 text-brand-red" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  F3 Lexicon
                </h1>
              </div>
              <div className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 space-y-2">
                <p>
                  New to F3? The lingo can be confusing — like being called an &quot;FNG&quot; (Friendly New Guy).
                </p>
                <p>
                  The F3 Lexicon is here to help. It&apos;s a quick-reference guide to the terms, acronyms, and phrases you&apos;ll see in Backblasts (workout recaps) or hear from the QIC (the workout leader).
                </p>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="h-8 w-8 text-brand-red" />
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                    F3 Lexicon
                  </h1>
                </div>
                <div className="text-base text-gray-600 dark:text-gray-300 max-w-3xl space-y-3">
                  <p>
                    New to F3? The lingo can be confusing — like being called an &quot;FNG&quot; (Friendly New Guy).
                  </p>
                  <p>
                    The F3 Lexicon is here to help. It&apos;s a quick-reference guide to the terms, acronyms, and phrases you&apos;ll see in Backblasts (workout recaps) or hear from the QIC (the workout leader).
                  </p>
                </div>
              </div>
              {session?.user ? (
                (permissions?.canSubmitLexicon || permissions?.canCreateLexicon) && (
                  <Link href="/submit-lexicon">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Lexicon Item
                    </Button>
                  </Link>
                )
              ) : (
                <Link href="/auth/sign-up?redirect=/submit-lexicon">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Lexicon Item
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Search and Filter Header */}
          <div className="md:sticky top-0 z-10 bg-gray-100/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 -mx-4 px-4 py-4 mb-6 shadow-sm transition-all duration-200">
            {/* Search Bar */}
            <div className={`flex justify-center transition-all duration-200 ${isScrolled ? 'mb-3' : 'mb-6'}`}>
              <div className="w-full max-w-2xl">
                <SearchBar
                  placeholder="Search F3 terminology..."
                  rotatingPlaceholders={!isScrolled ? [
                    "Search for F3 terms...",
                    "PAX...",
                    "Q...",
                    "Gloom...",
                    "BD...",
                    "AAR...",
                    "Accountability...",
                    "Actual Purpose...",
                    "Advantage...",
                    "Adversity...",
                    "AO...",
                    "Backblast...",
                    "Beatdown...",
                    "COT...",
                    "Convergence...",
                    "DRP...",
                    "EH...",
                    "F3...",
                    "FNG...",
                    "HC...",
                    "HIM...",
                    "IR...",
                    "Mary...",
                    "Mumblechatter...",
                    "Nantan...",
                    "PAINometer...",
                    "QIC...",
                    "Region...",
                    "Respect...",
                    "SAD...",
                    "Six...",
                    "Slack...",
                    "Weinke...",
                    "2.0...",
                    "YHC...",
                  ] : undefined}
                  defaultValue={searchInput}
                  onSearch={(value) => {
                    if (value && value.length > 0 && isScrolled) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                    setSearchInput(value);
                    setActiveLetter(undefined); // Clear letter filter when searching
                  }}
                  showButton={false}
                />
              </div>
            </div>

            {/* Alphabet Navigation - Show when not scrolled or no search */}
            {(!isScrolled || !searchQuery) && (
              <AlphabetNav
                availableLetters={availableLetters}
                activeLetter={activeLetter}
                onLetterClick={handleLetterClick}
                onShowAll={handleShowAll}
              />
            )}
          </div>

          {/* Results section */}
          <div>
            {/* Mobile Layout */}
            <div className="block lg:hidden mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {activeLetter ? `Terms starting with "${activeLetter}"` : 
                   searchQuery ? 'Search Results' : 'All Terms'}
                </h2>
                {/* Simple plus icon button on mobile */}
                {session?.user ? (
                  (permissions?.canSubmitLexicon || permissions?.canCreateLexicon) && (
                    <Link href="/submit-lexicon">
                      <Button size="sm" className="flex items-center gap-1 p-2">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </Link>
                  )
                ) : (
                  <Link href="/auth/sign-up?redirect=/submit-lexicon">
                    <Button size="sm" className="flex items-center gap-1 p-2">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {`${currentTotalCount} found`}
              </span>
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {activeLetter ? `Terms starting with "${activeLetter}"` : 
                 searchQuery ? 'Search Results' : 'All Terms'}
              </h2>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {`${currentTotalCount} found`}
                </span>
                <LexiconCSVDownloadButton
                  searchQuery={searchQuery}
                  hasFiltersApplied={!!searchQuery || !!activeLetter}
                />
              </div>
            </div>

            {(isLoading && searchQuery) ? (
              <div className="flex justify-center items-center py-12">
                <Spinner variant="red" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading terms...
                </span>
              </div>
            ) : itemsToShow.length > 0 ? (
              <>
                <MasonryLayout 
                  className="mb-8"
                  columnMinWidth={280}
                  gap={24}
                >
                  {itemsToShow.map((item: LexiconListItem) => (
                    <LexiconCard
                      key={item._id}
                      item={item}
                      onCopyDefinition={handleCopyDefinition}
                    />
                  ))}
                </MasonryLayout>

                {/* Load more for non-letter filtered results */}
                {!activeLetter && (
                  <div
                    ref={loadMoreRef}
                    className="flex justify-center items-center py-8"
                    style={{ minHeight: '100px' }}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Spinner variant="red" />
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          Loading more terms...
                        </span>
                      </>
                    ) : hasNextPage ? (
                      <div className="text-gray-600 dark:text-gray-400">
                        Scroll for more...
                      </div>
                    ) : (
                      <div className="text-gray-600 dark:text-gray-400">
                        No more terms to load
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No terms found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery 
                    ? `No terms match "${searchQuery}"`
                    : activeLetter 
                    ? `No terms start with "${activeLetter}"`
                    : 'No terms available'
                  }
                </p>
                {(searchQuery || activeLetter) && (
                  <Button
                    onClick={() => {
                      setSearchInput('');
                      setActiveLetter(undefined);
                      setDisplayItems(initialItems);
                    }}
                    className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    Show all terms
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { query = '', page = '1' } = context.query;

  const currentPage = parseInt(page as string, 10) || 1;
  const searchQuery = query as string;

  try {
    // Get initial items (first page)
    const initialData = searchQuery
      ? await import('@/lib/api/lexicon').then(mod => mod.searchLexiconItems(searchQuery, currentPage, 24))
      : await import('@/lib/api/lexicon').then(mod => mod.getAllLexiconItems(currentPage, 24));

    // Get items grouped by letter for alphabet navigation
    const itemsByLetter = await import('@/lib/api/lexicon').then(mod => mod.getLexiconItemsByLetter());

    return {
      props: {
        initialItems: JSON.parse(JSON.stringify(initialData.items)),
        totalCount: initialData.totalCount,
        itemsByLetter: JSON.parse(JSON.stringify(itemsByLetter)),
        initialQuery: searchQuery || '',
        initialPage: currentPage
      }
    };
  } catch (error) {
    console.error('Error fetching lexicon data:', error);

    return {
      props: {
        initialItems: [],
        totalCount: 0,
        itemsByLetter: {},
        initialQuery: searchQuery || '',
        initialPage: currentPage
      }
    };
  }
}; 