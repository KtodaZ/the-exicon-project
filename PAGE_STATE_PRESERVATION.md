# Page State Preservation (filters + scroll on back navigation)

## Problem

Diving into an exercise or lexicon term and coming back lost everything:

- **Filters were dropped.** On `/exicon` the `router.push` that wrote filters to the
  URL had been commented out, so tags and the search box lived only in component
  state. `getServerSideProps` re-ran on the way back with no query params, and the
  list came back unfiltered.
- **Infinite scroll depth was lost.** The list restarted at page 1 even though the
  user had scrolled through several pages.
- **Scroll position was lost.** Next.js' pages router forces a scroll to `{0, 0}`
  on back/forward navigation unless `experimental.scrollRestoration` is enabled.
- On `/lexicon` the search filter used `router.push`, so every debounced keystroke
  added a history entry — the back button walked through them one at a time instead
  of returning to the previous page. The letter filter wasn't in the URL at all.

## Solution

Three pieces, split by what each one is good at.

### 1. Filters live in the URL

Both list pages sync their filters to the URL with a shallow `router.replace`:

- `/exicon` → `?query=…&tags=…`
- `/lexicon` → `?query=…&letter=…`

`replace` (not `push`) keeps history clean — one entry per visit to the list, not
one per keystroke — and `scroll: false` stops the URL update from jumping to the
top. Because the filters are in the URL, they come back with the history entry and
`getServerSideProps` re-renders the correct filtered list. Filtered lists are now
shareable and survive a reload too.

### 2. Scroll offset + pagination depth: `hooks/useListPageState.ts`

The URL can't carry "how far down the list the user was", so the hook snapshots
`{ asPath, scrollY, itemCount, pageCount }` to `sessionStorage` when the user
leaves the page, and on the way back:

1. Confirms the visit is actually a return (the previous route was a page nested
   under the list) and that the filters match what was saved.
2. Calls `fetchNextPage()` until the list is as deep as it was.
3. Restores the scroll offset, holding it briefly while images and the masonry
   layout settle. Any real user gesture (wheel, touch, key, click) aborts the
   restore immediately, and it gives up after a few seconds.

Because the TanStack Query cache lives in `_app`, returning to the list normally
rebuilds all loaded pages from cache instantly; step 2 only does real work after a
reload or once the cache has expired (`gcTime` is now 30 minutes).

Arriving from anywhere else — the nav bar, a tag link, an external link — is not a
return, so the list opens fresh at the top.

### 3. `components/ui/back-link.tsx`

"Back to Exercises" / "Back to Lexicon" used a plain `<Link href="/exicon">`, which
threw away the query string. `BackLink` goes back through history when the user
really came from the list (restoring the URL and letting the list page restore its
scroll), and otherwise links to the last list URL it remembers.

`lib/navigation-history.ts` is the small tracker behind both this and the
return-visit check; it records the previous in-app route on every route change.

### Also fixed along the way

- `experimental.scrollRestoration` is enabled, so back/forward stops jumping to the
  top of *every* page (detail pages included), not just the two list pages.
- `/exicon`'s server-rendered first page fetched 18 items while the client fetched
  pages of 24, so items 19–24 were skipped between page 1 and page 2. Both now use
  a single `PAGE_SIZE`.
- Paginated results are de-duplicated by `_id` (`uniqueById`), since the SSR first
  page and the API can order results slightly differently.

## Adding this to another list page

```tsx
const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteScroll(...);
const items = uniqueById(data?.pages.flatMap(page => page.items) ?? []);

useListPageState({
  storageKey: '/my-list',      // the page's pathname
  itemCount: items.length,
  pageCount: data?.pages.length ?? 0,
  hasNextPage: !!hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isReady: !isLoading && items.length > 0
});
```

Keep the page's filters in the URL as well, or the hook will (correctly) decline to
restore a position that belongs to a different set of filters.
