import { useState, useEffect, useRef, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button, buttonVariants, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExerciseCard } from '@/components/exercise-card';
import { TagBadge } from '@/components/ui/tag-badge';
import { ExerciseListItem } from '@/lib/models/exercise';
import { Search, X } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SearchBar } from '@/components/ui/searchbar';
import { TagList } from '@/components/ui/tag-list';
import { ActiveFilters, FilterItem } from '@/components/ui/active-filters';
import { searchExercises, getAllExercises, getPopularTags } from '@/lib/api/exercise';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

interface ExiconPageProps {
  initialExercises: ExerciseListItem[];
  totalCount: number;
  popularTags: { tag: string; count: number }[];
  initialQuery: string;
  initialTags: string[];
  initialPage: number;
}

// Fetch function for TanStack Query
const fetchExercises = async ({ pageParam = 1, queryKey }: any) => {
  const [, searchQuery, activeTags] = queryKey;
  const queryParams = new URLSearchParams();
  queryParams.append('page', pageParam.toString());
  queryParams.append('limit', '12');
  
  if (searchQuery) {
    queryParams.append('query', searchQuery);
  }
  
  if (activeTags?.length > 0) {
    activeTags.forEach((tag: string) => {
      queryParams.append('tags', tag);
    });
  }
  
  const response = await fetch(`/api/exercises?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch exercises');
  }
  
  return response.json();
};

export default function ExiconPage({
  initialExercises,
  totalCount,
  popularTags,
  initialQuery,
  initialTags,
  initialPage
}: ExiconPageProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTags, setActiveTags] = useState<string[]>(initialTags);

  // Store the truly initial data from SSR in refs to keep it stable for useInfiniteQuery's initialData
  const initialExercisesRef = useRef(initialExercises);
  const initialTotalCountRef = useRef(totalCount);
  const initialPageRef = useRef(initialPage);

  // Update URL when filters change
  useEffect(() => {
    // Only run if router is ready and we are on the /exicon page.
    // This check helps prevent premature execution or execution on other pages if this component were reused.
    if (!router.isReady || router.pathname !== '/exicon') {
      return;
    }

    const newPushQuery: any = {};
    if (searchQuery) { // searchQuery is component state
      newPushQuery.query = searchQuery;
    }
    if (activeTags && activeTags.length > 0) { // activeTags is component state
      newPushQuery.tags = activeTags;
    }

    // Normalize current relevant query params from router.query for comparison
    const currentRouterQueryNormalized: any = {};
    if (router.query.query && typeof router.query.query === 'string') {
      currentRouterQueryNormalized.query = router.query.query;
    }
    
    let currentRouterTagsSorted: string[] = [];
    if (router.query.tags) {
      const tagsArray = Array.isArray(router.query.tags) 
        ? router.query.tags 
        : [router.query.tags as string];
      // Ensure tags are strings and filter out empty ones, then sort for comparison
      currentRouterTagsSorted = tagsArray
        .filter(tag => typeof tag === 'string' && tag.length > 0)
        .sort();
    }

    const newPushQueryString = newPushQuery.query || "";
    const currentRouterQueryString = currentRouterQueryNormalized.query || "";

    const newPushQueryTagsSorted = newPushQuery.tags ? [...newPushQuery.tags].sort() : [];

    // Check if the new query would be identical to the current one
    const isIdentical =
      newPushQueryString === currentRouterQueryString &&
      newPushQueryTagsSorted.length === currentRouterTagsSorted.length &&
      newPushQueryTagsSorted.every((tag, index) => tag === currentRouterTagsSorted[index]);

    if (!isIdentical) {
      // TEMPORARILY COMMENTING OUT ROUTER.PUSH FOR DIAGNOSTICS
      /*
      router.push(
        {
          pathname: '/exicon',
          query: newPushQuery,
        },
        undefined, // \`as\` parameter
        { shallow: false } // Explicitly use default behavior (runs GSSP)
      );
      */
    }
  }, [searchQuery, activeTags, router.isReady, router.pathname, router.query]);

  // Use the custom infinite scroll hook
  // Only use initialData if current query matches the SSR initial query
  const isInitialQuery = searchQuery === initialQuery && 
    activeTags.length === initialTags.length &&
    activeTags.every(tag => initialTags.includes(tag));

  const {
    data,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
  } = useInfiniteScroll<ExerciseListItem>({
    queryKey: ['exercises', searchQuery, activeTags],
    fetchFn: fetchExercises,
    initialData: isInitialQuery ? {
      pages: [{ exercises: initialExercisesRef.current, totalCount: initialTotalCountRef.current }],
      pageParams: [initialPageRef.current],
    } : undefined,
    initialPageParam: 1, // Always start from page 1 for new queries
  });

  // Flatten all exercises from all pages
  const exercises = data?.pages.flatMap((page: { exercises: ExerciseListItem[]; totalCount: number }) => page.exercises) ?? [];
  const currentTotalCount = data?.pages[0]?.totalCount ?? totalCount;

  const toggleTag = (tag: string) => {
    setActiveTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveTags([]);
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error loading exercises</h1>
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
        <title>Exicon - Exercise Directory</title>
        <meta name="description" content="Browse our comprehensive collection of exercises" />
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-black">
        <div className="container mx-auto py-8">
          <div className="mb-8 pt-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Exercise Directory
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Browse our comprehensive collection of exercises
            </p>
          </div>

          {/* Sticky utility bar with search and filters */}
          <div className="sticky top-0 z-10 bg-gray-100/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 -mx-4 px-4 py-4 mb-6 shadow-sm">
            <div className="space-y-4">
              <SearchBar
                placeholder="Search exercises..."
                defaultValue={searchQuery}
                onSearch={(value) => {
                  setSearchQuery(value);
                }}
                className="max-w-md"
              />

              {/* Popular tags */}
              <div>
                <h2 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Popular Tags
                </h2>
                <TagList 
                  tags={popularTags}
                  activeTags={activeTags}
                  onTagClick={toggleTag}
                  showCounts={false}
                  initialDisplayCount={20}
                  showViewMore={true}
                />
              </div>

              {/* Active filters */}
              {(activeTags.length > 0 || searchQuery) && (
                <ActiveFilters
                  filters={[
                    ...(searchQuery ? [{ type: 'Search', value: searchQuery }] : []),
                    ...activeTags.map(tag => ({ type: 'Tag', value: tag }))
                  ]}
                  onRemove={(filter) => {
                    if (filter.type === 'Search') {
                      setSearchQuery('');
                    } else if (filter.type === 'Tag') {
                      toggleTag(filter.value);
                    }
                  }}
                  onClearAll={clearFilters}
                />
              )}
            </div>
          </div>

          {/* Results section */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Exercises
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {`${currentTotalCount} found`}
              </span>
            </div>

            {exercises.length > 0 ? (
              <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-8 mb-8">
                  {exercises.map((exercise: ExerciseListItem) => (
                    <div key={exercise._id}>
                      <ExerciseCard
                        exercise={exercise}
                        onTagClick={toggleTag}
                      />
                    </div>
                  ))}
                </div>

                {/* Load more trigger element */}
                <div 
                  ref={loadMoreRef}
                  className="flex justify-center items-center py-8"
                  style={{ minHeight: '100px' }} // Ensure the element has visible height
                >
                  {isFetchingNextPage ? (
                    <>
                      <Spinner variant="red" />
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        Loading more exercises...
                      </span>
                    </>
                  ) : hasNextPage ? (
                    <div className="text-gray-600 dark:text-gray-400">
                      Scroll for more...
                    </div>
                  ) : (
                    <div className="text-gray-600 dark:text-gray-400">
                      No more exercises to load
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No exercises found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Try adjusting your search or filter criteria
                </p>
                <Button 
                  onClick={clearFilters}
                  className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { query = '', tags = [], page = '1' } = context.query;
  
  const currentPage = parseInt(page as string, 10) || 1;
  const searchQuery = query as string;
  const selectedTags = Array.isArray(tags) ? tags as string[] : tags ? [tags as string] : [];
  
  try {
    // Directly call the database functions instead of making HTTP requests
    let exercisesData;
    
    if (searchQuery || selectedTags.length > 0) {
      // Use search function if there's a query or tags
      exercisesData = await searchExercises(searchQuery, selectedTags, currentPage, 12);
    } else {
      // Use getAllExercises for the default case
      exercisesData = await getAllExercises(currentPage, 12);
    }
    
    // Get popular tags (no limit to show all tags)
    const popularTags = await getPopularTags(1000);
    
    return {
      props: {
        initialExercises: JSON.parse(JSON.stringify(exercisesData.exercises)),
        totalCount: exercisesData.totalCount,
        popularTags: JSON.parse(JSON.stringify(popularTags)),
        initialQuery: searchQuery || '',
        initialTags: selectedTags,
        initialPage: currentPage
      }
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    
    return {
      props: {
        initialExercises: [],
        totalCount: 0,
        popularTags: [],
        initialQuery: searchQuery || '',
        initialTags: selectedTags,
        initialPage: currentPage
      }
    };
  }
};