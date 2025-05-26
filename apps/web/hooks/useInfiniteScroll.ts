import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

interface PageData<T> {
  exercises: T[];
  totalCount: number;
}

interface UseInfiniteScrollOptions<T> {
  queryKey: any[];
  fetchFn: ({ pageParam, queryKey }: { pageParam: number; queryKey: any[] }) => Promise<PageData<T>>;
  initialData?: {
    pages: PageData<T>[];
    pageParams: number[];
  };
  initialPageParam: number;
}

export function useInfiniteScroll<T>({
  queryKey,
  fetchFn,
  initialData,
  initialPageParam,
}: UseInfiniteScrollOptions<T>) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: fetchFn,
    initialPageParam,
    getNextPageParam: (lastPage: PageData<T>, allPages: PageData<T>[]) => {
      const totalLoaded = allPages.reduce((acc, page) => acc + page.exercises.length, 0);
      return totalLoaded < lastPage.totalCount ? allPages.length + 1 : undefined;
    },
    ...(initialData && { initialData }),
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = infiniteQuery;

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    ...infiniteQuery,
    loadMoreRef,
  };
} 