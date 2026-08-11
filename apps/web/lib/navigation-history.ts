import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Tracks the previous in-app route so a page can tell whether the user just
 * arrived from a "dive in" (a detail page) or from somewhere else entirely.
 * Persisted in sessionStorage so it survives a reload of the current page.
 */

const STORAGE_KEY = 'exicon:navigation-history';

interface NavigationHistory {
  current: string | null;
  previous: string | null;
}

let history: NavigationHistory = { current: null, previous: null };
let hydrated = false;

/** Strips the query string and hash so only the page identity is compared. */
export function pathnameOf(url: string): string {
  return url.split(/[?#]/)[0];
}

function hydrate() {
  if (hydrated || typeof window === 'undefined') {
    return;
  }
  hydrated = true;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as NavigationHistory;
      history = {
        current: typeof stored?.current === 'string' ? stored.current : null,
        previous: typeof stored?.previous === 'string' ? stored.previous : null
      };
    }
  } catch (error) {
    // sessionStorage can be unavailable (private mode, embedded webviews)
  }
}

function persist() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    // Ignore: navigation tracking is best-effort
  }
}

export function recordNavigation(url: string) {
  hydrate();

  if (history.current === url) {
    return;
  }

  if (history.current && pathnameOf(history.current) === pathnameOf(url)) {
    // Same page, different query (e.g. filters written with a shallow replace).
    // Keep `previous` pointing at the last genuinely different page.
    history.current = url;
  } else {
    history.previous = history.current;
    history.current = url;
  }

  persist();
}

/** The last in-app URL visited before the current one, if any. */
export function getPreviousPath(): string | null {
  hydrate();
  return history.previous;
}

/** True when the user arrived on the current page from `pathname`. */
export function cameFrom(pathname: string): boolean {
  const previous = getPreviousPath();
  return !!previous && pathnameOf(previous) === pathname;
}

/** Mounted once in _app so every route change is recorded. */
export function useNavigationHistory() {
  const router = useRouter();

  useEffect(() => {
    recordNavigation(router.asPath);

    const handleRouteChange = (url: string) => recordNavigation(url);

    router.events.on('routeChangeStart', handleRouteChange);
    router.events.on('hashChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      router.events.off('hashChangeStart', handleRouteChange);
    };
  }, [router]);
}
