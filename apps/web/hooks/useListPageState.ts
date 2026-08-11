import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { getPreviousPath, pathnameOf } from '@/lib/navigation-history';

/**
 * Remembers where the user was in a paginated list (scroll offset, how many
 * pages were loaded, and the filtered URL) and puts them back there when they
 * return from a detail page.
 *
 * Filters themselves live in the URL, so they come back with the history entry.
 * This hook covers the parts the URL can't carry: the infinite-scroll depth and
 * the scroll offset.
 */

const STORAGE_PREFIX = 'exicon:list-state:';

/** Snapshots older than this are ignored so a stale position never surprises the user. */
const MAX_SNAPSHOT_AGE_MS = 30 * 60 * 1000;

/** Stop trying to grow the list / nudge the scroll after this long. */
const RESTORE_TIMEOUT_MS = 6000;

/** How often the restore loop re-checks the list while it grows back. */
const RESTORE_INTERVAL_MS = 80;

/** How long to keep holding the restored offset while the layout settles. */
const RESTORE_SETTLE_MS = 500;

export interface ListSnapshot {
  /** Full list URL, filters included, that produced this snapshot. */
  asPath: string;
  scrollY: number;
  itemCount: number;
  pageCount: number;
  savedAt: number;
}

export function readListSnapshot(storageKey: string): ListSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + storageKey);
    if (!raw) {
      return null;
    }

    const snapshot = JSON.parse(raw) as ListSnapshot;
    if (typeof snapshot?.asPath !== 'string' || typeof snapshot?.scrollY !== 'number') {
      return null;
    }

    return Date.now() - snapshot.savedAt <= MAX_SNAPSHOT_AGE_MS ? snapshot : null;
  } catch (error) {
    return null;
  }
}

function writeListSnapshot(storageKey: string, snapshot: ListSnapshot) {
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(snapshot));
  } catch (error) {
    // Ignore: state restoration is best-effort
  }
}

/**
 * The list URL (filters included) that a detail page should return to.
 * Falls back to the plain list route when there is nothing remembered.
 */
export function getSavedListUrl(storageKey: string, fallback: string): string {
  return readListSnapshot(storageKey)?.asPath ?? fallback;
}

interface UseListPageStateOptions {
  /** Stable key for this list, normally the page's pathname (e.g. `/exicon`). */
  storageKey: string;
  /** Items currently rendered. */
  itemCount: number;
  /** Pages the infinite query currently holds. */
  pageCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  /** True once the list is showing real data rather than a loading state. */
  isReady: boolean;
  /**
   * Whether arriving from `previousPath` should restore the snapshot.
   * Defaults to "came from a page nested under this list".
   */
  shouldRestoreFrom?: (previousPath: string) => boolean;
}

export function useListPageState({
  storageKey,
  itemCount,
  pageCount,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isReady,
  shouldRestoreFrom
}: UseListPageStateOptions) {
  const router = useRouter();
  const [restoreTarget, setRestoreTarget] = useState<ListSnapshot | null>(null);

  // Kept in a ref so the save handler and the restore loop always see current
  // values without having to re-subscribe or restart.
  const latest = useRef({
    itemCount,
    pageCount,
    hasNextPage,
    isFetchingNextPage,
    isReady,
    asPath: router.asPath,
    fetchNextPage
  });

  useEffect(() => {
    latest.current = {
      itemCount,
      pageCount,
      hasNextPage,
      isFetchingNextPage,
      isReady,
      asPath: router.asPath,
      fetchNextPage
    };
  });

  // Save a snapshot whenever the user leaves the page.
  useEffect(() => {
    const save = (destination?: string) => {
      const { itemCount: items, pageCount: pages, asPath } = latest.current;

      // Shallow URL updates (filter changes) stay on the page - nothing to restore.
      if (destination && pathnameOf(destination) === pathnameOf(asPath)) {
        return;
      }

      if (items === 0) {
        return;
      }

      writeListSnapshot(storageKey, {
        asPath,
        scrollY: window.scrollY,
        itemCount: items,
        pageCount: pages,
        savedAt: Date.now()
      });
    };

    const saveOnHide = () => save();

    router.events.on('routeChangeStart', save);
    window.addEventListener('pagehide', saveOnHide);

    return () => {
      router.events.off('routeChangeStart', save);
      window.removeEventListener('pagehide', saveOnHide);
    };
  }, [router, storageKey]);

  // Decide once, on mount, whether this visit is a return that should be restored.
  useEffect(() => {
    const snapshot = readListSnapshot(storageKey);
    if (!snapshot) {
      return;
    }

    // Only restore when the filters match what was saved, otherwise the
    // remembered offset belongs to a different list.
    if (snapshot.asPath !== router.asPath) {
      return;
    }

    if (snapshot.scrollY < 1 && snapshot.pageCount <= 1) {
      return;
    }

    const previousPath = getPreviousPath();
    if (!previousPath) {
      return;
    }

    const isReturn = shouldRestoreFrom
      ? shouldRestoreFrom(previousPath)
      : pathnameOf(previousPath).startsWith(`${storageKey}/`);

    if (isReturn) {
      setRestoreTarget(snapshot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grow the list back to its previous depth, then put the scroll offset back.
  useEffect(() => {
    if (!restoreTarget) {
      return;
    }

    const startedAt = Date.now();
    let settledSince: number | null = null;
    // A deliberate user gesture always wins over restoration.
    const abortEvents = ['wheel', 'touchmove', 'keydown', 'mousedown'];
    let interval: ReturnType<typeof setInterval> | undefined;

    const cleanUp = () => {
      if (interval) {
        clearInterval(interval);
      }
      abortEvents.forEach(event => window.removeEventListener(event, abort));
    };

    const finish = () => {
      cleanUp();
      setRestoreTarget(null);
    };

    const abort = () => finish();

    /** Scrolls as close to the remembered offset as the current page allows. */
    const applyScroll = () => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
      const goal = Math.min(restoreTarget.scrollY, maxScroll);

      if (Math.abs(window.scrollY - goal) > 2) {
        window.scrollTo(0, goal);
      }

      return goal;
    };

    const tick = () => {
      if (Date.now() - startedAt > RESTORE_TIMEOUT_MS) {
        // Out of time: get as close as we can rather than leaving the user at the top.
        applyScroll();
        finish();
        return;
      }

      const {
        itemCount: items,
        pageCount: pages,
        hasNextPage: canLoadMore,
        isFetchingNextPage: isLoadingMore,
        isReady: ready,
        fetchNextPage: loadMore
      } = latest.current;

      if (!ready) {
        return;
      }

      if (pages < restoreTarget.pageCount && canLoadMore && !isLoadingMore) {
        loadMore();
        return;
      }

      const listIsBackToSize = items >= restoreTarget.itemCount || !canLoadMore;
      if (!listIsBackToSize) {
        return;
      }

      const goal = applyScroll();
      if (goal < restoreTarget.scrollY - 2) {
        // The page is still shorter than it was - wait for more content.
        return;
      }

      // Hold the offset briefly: images and lazily measured layouts (masonry)
      // can still shift things around right after the list renders.
      if (settledSince === null) {
        settledSince = Date.now();
      } else if (Date.now() - settledSince > RESTORE_SETTLE_MS) {
        finish();
      }
    };

    abortEvents.forEach(event => window.addEventListener(event, abort, { passive: true }));
    interval = setInterval(tick, RESTORE_INTERVAL_MS);
    tick();

    return cleanUp;
  }, [restoreTarget]);

  return { isRestoringState: restoreTarget !== null };
}
