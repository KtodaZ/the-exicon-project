import { useState, useEffect, useRef } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button, buttonVariants, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExerciseCard } from '@/components/exercise-card';
import { TagBadge } from '@/components/ui/tag-badge';
import { ExerciseListItem } from '@/lib/models/exercise';
import { Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SearchBar } from '@/components/ui/searchbar';
import { TagList } from '@/components/ui/tag-list';
import { ActiveFilters } from '@/components/ui/active-filters';
import { searchExercises, getAllExercises, getPopularTags } from '@/lib/api/exercise';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { WORKOUT_TAG_CATEGORIES, type WorkoutTag } from '@/types/workout-tags';

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
  const { data: session } = useSession();
  const { data: permissions } = usePermissions();
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [activeTags, setActiveTags] = useState<string[]>(initialTags);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Debounce the search input
  const searchQuery = useDebounce(searchInput, 300);

  // Store the truly initial data from SSR in refs to keep it stable for useInfiniteQuery's initialData
  const initialExercisesRef = useRef(initialExercises);
  const initialTotalCountRef = useRef(totalCount);
  const initialPageRef = useRef(initialPage);

  // Scroll detection for minified filter view
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY > 150;
          setIsScrolled(scrolled);

          // Auto-collapse categories when user starts scrolling
          if (scrolled && showAllCategories) {
            setShowAllCategories(false);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAllCategories]);

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
    setSearchInput('');
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
        <div className="container mx-auto py-6">
          <div className="mb-4 pt-4">
            {/* Mobile Layout */}
            <div className="block lg:hidden text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">
                Exercise Directory
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">
                Explore all exercises. Created by PAX, for PAX.
              </p>
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:flex justify-between items-start">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Exercise Directory
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-300">
                  Explore all exercises. Created by PAX, for PAX.
                </p>
              </div>
              {session?.user ? (
                (permissions?.canSubmitExercise || permissions?.canCreateExercise) && (
                  <Link href="/submit-exercise">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Exercises
                    </Button>
                  </Link>
                )
              ) : (
                <Link href="/auth/sign-up">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Exercises
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Search and Filter Header */}
          <div className="md:sticky top-0 z-10 bg-gray-100/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 -mx-4 px-4 py-4 mb-6 shadow-sm transition-all duration-200">
            {/* Search Bar - Centered and Larger */}
            <div className={`flex justify-center transition-all duration-200 ${isScrolled ? 'mb-2' : 'mb-6'}`}>
              <div className="w-full max-w-2xl">
                <SearchBar
                  placeholder="Search exercises..."
                  rotatingPlaceholders={!isScrolled ? [
                    "Search for a specific workout...",
                    // Classic popular exercises
                    "Burpees...",
                    "Navy Seal Burpee...",
                    "Monkey Humpers...",
                    "Squats...",
                    "Bulgarian Split Squat...",
                    "Broken Bicycle...",
                    "McDuck...",
                    "Multi-Merkin...",
                    "Squirrel Splat...",
                    "Primate Humper O-Rama...",
                    "Elizabeth Warren...",
                    "The Jeffrey Leonard...",
                    "Killer Roos...",
                    "Necro Bunny...",
                    "Sleeping Bunny...",
                    "Energizer Bunnies...",
                    "Beach Bunnies...",
                    "The Dirty Dog...",
                    "Grocery Carry...",
                    // Unique and creative exercise names
                    "Zebra Butt-Kicks...",
                    "Yves Poll...",
                    "Yurpee...",
                    "Yul Brynner...",
                    "Yoke Walk...",
                    "XYs...",
                    "Wilson's Wife...",
                    "When Animals Attack...",
                    "Wheel of Merkin...",
                    "Wheel of Animal Walk...",
                    "Whamo Lunge Walks...",
                    "Werewolf...",
                    "Underdog...",
                    "Ultimate Frisburpee...",
                    "Ultimate Football...",
                    "UHaul...",
                    "Twinkle Toes...",
                    "Superman Merkin...",
                    "Super 21...",
                    "Sumo Squat...",
                    "Suicides...",
                    // Additional creative exercises
                    "Shoots and Ladders...",
                    "SheHateMe...",
                    "Shawshank...",
                    "Seal Jacks...",
                    "Seal Crawl...",
                    "Scout Run...",
                    "People's Air Presses...",
                    "Peeping Lipstick...",
                    "Paula Abdul...",
                    "Pattycake Merkin...",
                    "Partner Shrug...",
                    "Partner Plank Curls...",
                    // Essential tag searches only
                    "Upper Body...",
                    "Lower Body...",
                    "Core...",
                    "Cardio...",
                    "Coupon...",
                    "Partner...",
                    "Game..."
                  ] : undefined}
                  filterPills={isScrolled && (activeTags.length > 0 || searchQuery) ? (
                    <div className="flex items-center gap-2 text-xs">
                      {searchQuery && (
                        <button
                          onClick={() => setSearchInput('')}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex items-center gap-1 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          &quot;{searchQuery}&quot;
                        </button>
                      )}
                      {activeTags.slice(0, 3).map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className="px-2 py-1 bg-brand-red text-white rounded-full flex items-center gap-1 hover:bg-red-700 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          {tag.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </button>
                      ))}
                      {activeTags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                          +{activeTags.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : undefined}
                  defaultValue={searchInput}
                  onSearch={(value) => {
                    // If user starts typing while scrolled down, scroll back to top
                    if (value && value.length > 0 && isScrolled) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                    setSearchInput(value);
                  }}
                  showButton={false}
                />
              </div>
            </div>


            {/* Tags - Show when not scrolled */}
            {!isScrolled && (
              <div className="flex flex-col items-center">
                <div className="flex flex-wrap gap-4 items-center justify-center mb-4">
                  {/* Simplified tag list */}
                  {[
                    { tag: 'upper-body', label: 'Arms' },
                    { tag: 'lower-body', label: 'Legs' },
                    { tag: 'endurance', label: 'Cardio' },
                    { tag: 'coupon', label: 'Coupon' },
                    { tag: 'core', label: 'Mary' },
                    { tag: 'music', label: 'Music' },
                    { tag: 'routine', label: 'Routine' },
                    { tag: 'partner', label: 'Partner' },
                    { tag: 'game', label: 'Game' },
                    { tag: 'video', label: 'Video' }
                  ].map(({ tag, label }) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-lg transition-colors ${activeTags.includes(tag)
                        ? 'text-brand-red font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:text-brand-red'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Expand/Collapse button - Larger and more prominent */}
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-brand-red hover:text-white transition-all duration-300 rounded-full p-3 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                >
                  {showAllCategories ? (
                    <>
                      <ChevronUp className="h-6 w-6" />
                      <span className="text-sm font-medium">Show Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-6 w-6" />
                      <span className="text-sm font-medium">More Categories</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Full Filter Categories - Show when expanded with animation */}
            {!isScrolled && showAllCategories && (
              <div className="mt-6 animate-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col items-center">
                  <div className="max-w-6xl w-full">
                    <div className="grid grid-cols-6 gap-6">
                      {[
                        ['fundamentals', WORKOUT_TAG_CATEGORIES['fundamentals'], 'Fundamentals'],
                        ['exercises', WORKOUT_TAG_CATEGORIES['exercises'], 'Exercises'],
                        ['isolation', WORKOUT_TAG_CATEGORIES['isolation'], 'Isolation'],
                        ['locations', WORKOUT_TAG_CATEGORIES['locations'], 'Locations'],
                        ['equipment', WORKOUT_TAG_CATEGORIES['equipment'], 'Equipment'],
                        ['other', WORKOUT_TAG_CATEGORIES['other'], 'Other']
                      ].map(([categoryKey, tags, displayName]) => {
                        const categoryTags = tags as WorkoutTag[];
                        const key = categoryKey as string;
                        return (
                          <div key={key} className="flex flex-col">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                              {displayName}
                            </h3>
                            <div className="flex flex-col gap-2">
                              <TagList
                                tags={categoryTags}
                                activeTags={activeTags}
                                onTagClick={toggleTag}
                                showCounts={false}
                                className="flex flex-col gap-2"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Filters - Only show when not scrolled */}
            {!isScrolled && (activeTags.length > 0 || searchQuery) && (
              <div className="mt-4">
                <ActiveFilters
                  filters={[
                    ...(searchQuery ? [{ type: 'Search', value: searchQuery }] : []),
                    ...activeTags.map(tag => ({ type: 'Tag', value: tag }))
                  ]}
                  onRemove={(filter) => {
                    if (filter.type === 'Search') {
                      setSearchInput('');
                    } else if (filter.type === 'Tag') {
                      toggleTag(filter.value);
                    }
                  }}
                  onClearAll={clearFilters}
                />
              </div>
            )}
          </div>

          {/* Results section */}
          <div>
            {/* Mobile Layout */}
            <div className="block lg:hidden mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Exercises
                </h2>
                {/* Simple plus icon button on mobile */}
                {session?.user ? (
                  (permissions?.canSubmitExercise || permissions?.canCreateExercise) && (
                    <Link href="/submit-exercise">
                      <Button size="sm" className="flex items-center gap-1 p-2">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </Link>
                  )
                ) : (
                  <Link href="/auth/sign-up">
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
                Exercises
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {`${currentTotalCount} found`}
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Spinner variant="red" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading exercises...
                </span>
              </div>
            ) : exercises.length > 0 ? (
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
      // Use search function if there's a query or tags - explicitly pass status: 'active'
      exercisesData = await searchExercises(searchQuery, selectedTags, currentPage, 12, {
        status: 'active'
      });
    } else {
      // Use getAllExercises for the default case - explicitly pass status: 'active'
      exercisesData = await getAllExercises(currentPage, 12, {
        status: 'active'
      });
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