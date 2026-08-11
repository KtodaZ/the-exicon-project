import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { cameFrom, pathnameOf } from '@/lib/navigation-history';
import { getSavedListUrl } from '../../hooks/useListPageState';

interface BackLinkProps {
  /** The list route this link goes back to, e.g. `/exicon`. */
  href: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * "Back to list" link that keeps the list's state.
 *
 * When the user actually came from the list we go back through history, which
 * restores the URL (filters) and lets the list page put the scroll position
 * back. Otherwise we link to the last list URL we remember, so filters survive
 * even when there is no history entry to return to.
 */
export function BackLink({ href, className, children }: BackLinkProps) {
  const router = useRouter();
  const listPathname = pathnameOf(href);
  const [target, setTarget] = useState(href);
  const canGoBack = useRef(false);

  useEffect(() => {
    setTarget(getSavedListUrl(listPathname, href));
    canGoBack.current = cameFrom(listPathname);
  }, [href, listPathname]);

  const handleClick = (event: React.MouseEvent) => {
    // Let the browser handle modified clicks (new tab / window).
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    if (canGoBack.current) {
      event.preventDefault();
      router.back();
    }
  };

  return (
    <Link href={target} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
