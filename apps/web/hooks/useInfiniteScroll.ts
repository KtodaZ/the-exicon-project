import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

interface PageData<T> {
  items: T[];
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
      const totalLoaded = allPages.reduce((acc, page) => acc + page.items.length, 0);
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

    let debounceTimer: NodeJS.Timeout;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          // Debounce to prevent rapid firing
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchNextPage();
          }, 200);
        }
      },
      {
        root: null,
        rootMargin: '200px', // Increased margin to load earlier
        threshold: 0.1,
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    ...infiniteQuery,
    loadMoreRef,
  };
} 