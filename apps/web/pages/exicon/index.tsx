import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExerciseCard } from '@/components/exercise-card';
import { TagBadge } from '@/components/ui/tag-badge';
import { ExerciseListItem } from '@/lib/models/exercise';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Search, X } from 'lucide-react';

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
  const exercisesPerPage = 12;
  const totalPages = Math.ceil(totalCount / exercisesPerPage);

  // Update URL when filters change
  useEffect(() => {
    const query: any = { page: currentPage };
    
    if (searchQuery) {
      query.query = searchQuery;
    }
    
    if (activeTags.length > 0) {
      query.tags = activeTags;
    }
    
    router.push({
      pathname: '/exicon',
      query
    }, undefined, { shallow: true });
    
    // Load exercises
    loadExercises();
  }, [currentPage, searchQuery, activeTags]);

  const loadExercises = async () => {
    setLoading(true);
    
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', exercisesPerPage.toString());
      
      if (searchQuery) {
        queryParams.append('query', searchQuery);
      }
      
      activeTags.forEach(tag => {
        queryParams.append('tags', tag);
      });
      
      const response = await fetch(`/api/exercises?${queryParams.toString()}`);
      const data = await response.json();
      
      setExercises(data.exercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
  };

  const toggleTag = (tag: string) => {
    setActiveTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    setCurrentPage(1); // Reset to first page when tag filters change
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveTags([]);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <form onSubmit={handleSearch} className="max-w-md">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search exercises..."
                  className="pl-10 pr-4"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <Button 
                  type="submit" 
                  variant="red" 
                  className="absolute right-1 top-1 h-7 px-2 rounded-md"
                >
                  Search
                </Button>
              </div>
            </form>

            {/* Popular tags */}
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Popular Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {popularTags.map(({ tag, count }) => (
                  <TagBadge
                    key={tag}
                    tag={`${tag} (${count})`}
                    active={activeTags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                  />
                ))}
              </div>
            </div>

            {/* Active filters */}
            {(activeTags.length > 0 || searchQuery) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Active Filters
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="h-8 px-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear all
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <div className="flex items-center bg-gray-200 dark:bg-gray-800 rounded-md px-3 py-1">
                      <span className="text-sm mr-2">Search: {searchQuery}</span>
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {activeTags.map(tag => (
                    <div 
                      key={tag} 
                      className="flex items-center bg-gray-200 dark:bg-gray-800 rounded-md px-3 py-1"
                    >
                      <span className="text-sm mr-2">Tag: {tag}</span>
                      <button 
                        onClick={() => toggleTag(tag)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {loading ? 'Loading...' : `${totalCount} Exercises`}
              </h2>
            </div>

            {exercises.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {exercises.map(exercise => (
                    <ExerciseCard
                      key={exercise._id}
                      exercise={exercise}
                      onTagClick={toggleTag}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination className="my-8">
                    <PaginationContent>
                      {currentPage > 1 && (
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(currentPage - 1);
                            }} 
                          />
                        </PaginationItem>
                      )}

                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Show pages around current page
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              isActive={currentPage === pageNum}
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(pageNum);
                              }}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      {currentPage < totalPages && (
                        <PaginationItem>
                          <PaginationNext 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(currentPage + 1);
                            }} 
                          />
                        </PaginationItem>
                      )}
                    </PaginationContent>
                  </Pagination>
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
                <Button variant="outline" onClick={clearFilters}>
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
    // Fetch exercises
    const exercisesRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/exercises?${new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(searchQuery && { query: searchQuery }),
        ...selectedTags.reduce((acc, tag) => ({ ...acc, tags: tag }), {})
      }).toString()}`
    );
    
    const { exercises, totalCount } = await exercisesRes.json();
    
    // Fetch popular tags
    const tagsRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/tags/popular`
    );
    
    const popularTags = await tagsRes.json();
    
    return {
      props: {
        initialExercises: exercises,
        totalCount,
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