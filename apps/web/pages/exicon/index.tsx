import { useState, useEffect, useRef, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
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

interface ExiconPageProps {
  initialExercises: ExerciseListItem[];
  totalCount: number;
  popularTags: { tag: string; count: number }[];
  initialQuery: string;
  initialTags: string[];
  initialPage: number;
}

export default function ExiconPage({
  initialExercises,
  totalCount,
  popularTags,
  initialQuery,
  initialTags,
  initialPage
}: ExiconPageProps) {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseListItem[]>(initialExercises);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTags, setActiveTags] = useState<string[]>(initialTags);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialExercises.length < totalCount);
  const [currentTotalCount, setCurrentTotalCount] = useState(totalCount);
  const exercisesPerPage = 12;
  const observer = useRef<IntersectionObserver | null>(null);
  const lastExerciseElementRef = useRef<HTMLDivElement | null>(null);

  // Reset exercises when filters change
  useEffect(() => {
    if (currentPage === 1) {
      setExercises(initialExercises);
      setHasMore(initialExercises.length < totalCount);
    }
  }, [initialExercises, totalCount, currentPage]);

  // Update URL when filters change
  useEffect(() => {
    const query: any = {};
    
    if (searchQuery) {
      query.query = searchQuery;
    }
    
    if (activeTags.length > 0) {
      query.tags = activeTags;
    }
    
    router.push({
      pathname: '/exicon',
      query
    });
  }, [searchQuery, activeTags, router]);

  const loadExercises = useCallback(async (page: number) => {
    setLoading(true);
    
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', exercisesPerPage.toString());
      
      if (searchQuery) {
        queryParams.append('query', searchQuery);
      }
      
      activeTags.forEach(tag => {
        queryParams.append('tags', tag);
      });
      
      const response = await fetch(`/api/exercises?${queryParams.toString()}`);
      const data = await response.json();
      
      if (page === 1) {
        setExercises(data.exercises);
        setCurrentTotalCount(data.totalCount);
        setHasMore(data.exercises.length < data.totalCount);
      } else {
        setExercises(prev => {
          const newExercises = [...prev, ...data.exercises];
          setHasMore(newExercises.length < data.totalCount);
          return newExercises;
        });
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeTags, exercisesPerPage]);

  // Trigger search when filters change
  useEffect(() => {
    setCurrentPage(1);
    loadExercises(1);
  }, [loadExercises]);

  // Setup intersection observer for infinite scroll
  const lastExerciseRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setCurrentPage(prevPage => prevPage + 1);
        loadExercises(currentPage + 1);
      }
    });
    
    if (node) {
      observer.current.observe(node);
      lastExerciseElementRef.current = node;
    }
  }, [loading, hasMore, currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadExercises(1);
  };

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

  return (
    <>
      <Head>
        <title>Exicon - Exercise Directory</title>
        <meta name="description" content="Browse our comprehensive collection of exercises" />
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Exercise Directory
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Browse our comprehensive collection of exercises
            </p>
          </div>

          {/* Search and filters */}
          <div className="mb-8 space-y-6">
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
              <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Popular Tags
              </h2>
              <TagList 
                tags={popularTags}
                activeTags={activeTags}
                onTagClick={toggleTag}
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

          {/* Results */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {`${currentTotalCount} Exercises`}
              </h2>
            </div>

            {exercises.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {exercises.map((exercise, index) => (
                    <div 
                      key={exercise._id} 
                      ref={index === exercises.length - 1 ? lastExerciseRef : null}
                    >
                      <ExerciseCard
                        exercise={exercise}
                        onTagClick={toggleTag}
                      />
                    </div>
                  ))}
                </div>

                {/* Loading indicator */}
                {loading && (
                  <div className="flex justify-center items-center py-8">
                    <Spinner variant="red" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading more exercises...</span>
                  </div>
                )}
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
    
    // Get popular tags
    const popularTags = await getPopularTags();
    
    return {
      props: {
        initialExercises: exercisesData.exercises,
        totalCount: exercisesData.totalCount,
        popularTags,
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