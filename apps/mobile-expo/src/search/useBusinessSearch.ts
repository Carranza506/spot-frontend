import { useCallback, useRef, useState } from 'react';
import type { components } from '@spot/shared';

type Business = components['schemas']['Business'];
type Pagination = components['schemas']['PaginationMeta'];
type AiSearchCriteria = components['schemas']['AiSearchCriteria'];

/** A page of results plus, for the AI mode, the criteria it extracted. */
interface ResultsPage {
  businesses: Business[];
  pagination: Pagination;
  criteria?: AiSearchCriteria;
}

export type SearchResults =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      businesses: Business[];
      pagination: Pagination;
      criteria?: AiSearchCriteria;
      loadingMore: boolean;
      /** A failed "Cargar más": shown under the list, which stays on screen. */
      loadMoreError: string | null;
    }
  | { status: 'error'; message: string };

type PageFetcher = (page: number) => Promise<ResultsPage>;
/** Turns a failed request into the message to show; '' shows nothing (e.g. it already navigated away). */
type ErrorDescriber = (error: unknown) => string;

/**
 * One paginated business search at a time: `run` starts a search, `loadMore` appends its next page.
 * A slow response to an older search never overwrites a newer one.
 */
export function useBusinessSearch() {
  const [results, setResults] = useState<SearchResults>({ status: 'idle' });
  // The search on screen, so "Cargar más" repeats it with the next page and the same error wording.
  const fetchPageRef = useRef<PageFetcher | null>(null);
  const describeErrorRef = useRef<ErrorDescriber>(() => '');
  // Bumped per search (and per reset), so stale responses are dropped.
  const searchId = useRef(0);

  const run = useCallback(async (fetchPage: PageFetcher, describeError: ErrorDescriber) => {
    const id = ++searchId.current;
    fetchPageRef.current = fetchPage;
    describeErrorRef.current = describeError;
    setResults({ status: 'loading' });
    try {
      const page = await fetchPage(1);
      if (id !== searchId.current) return;
      setResults({ status: 'ready', ...page, loadingMore: false, loadMoreError: null });
    } catch (error) {
      if (id === searchId.current) setResults({ status: 'error', message: describeError(error) });
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (results.status !== 'ready' || results.loadingMore || !fetchPageRef.current) return;
    const id = searchId.current;
    const fetchPage = fetchPageRef.current;
    const nextPage = results.pagination.page + 1;
    setResults({ ...results, loadingMore: true, loadMoreError: null });
    try {
      const page = await fetchPage(nextPage);
      if (id !== searchId.current) return;
      setResults((current) => {
        if (current.status !== 'ready') return current;
        // Pages can overlap if a business was added meanwhile; keep each one once (unique keys).
        const seen = new Set(current.businesses.map((b) => b.id));
        const added = page.businesses.filter((b) => !seen.has(b.id));
        return { ...current, businesses: [...current.businesses, ...added], pagination: page.pagination, loadingMore: false };
      });
    } catch (error) {
      if (id !== searchId.current) return;
      const message = describeErrorRef.current(error);
      // Keep what's already listed; the error goes under it and "Cargar más" can be tapped again.
      setResults((current) =>
        current.status === 'ready' ? { ...current, loadingMore: false, loadMoreError: message || null } : current,
      );
    }
  }, [results]);

  const reset = useCallback(() => {
    searchId.current++;
    fetchPageRef.current = null;
    setResults({ status: 'idle' });
  }, []);

  return { results, run, loadMore, reset };
}
