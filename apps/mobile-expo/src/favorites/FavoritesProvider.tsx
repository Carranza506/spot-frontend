import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ApiError,
  addFavoriteBusiness,
  listFavoriteBusinesses,
  removeFavoriteBusiness,
  type components,
} from '@spot/shared';
import { authClient } from '@/api/client';
import { onSessionCleared } from '@/api/session-events';

type Business = components['schemas']['Business'];
type FavoriteBusiness = components['schemas']['FavoriteBusiness'];

/**
 * idle: not loaded yet (or reset on logout). forbidden: the account isn't a CLIENT (403). Favorites
 * are only trustworthy while the status is 'ready': in any other status `isFavorite` can't tell.
 */
export type FavoritesStatus = 'idle' | 'loading' | 'ready' | 'error' | 'forbidden';

interface FavoritesContextValue {
  status: FavoritesStatus;
  /** Newest first, as the API returns them. */
  favorites: FavoriteBusiness[];
  /** The last add/remove (or refresh) that failed, for the screen to show; cleared on the next toggle. */
  actionError: string | null;
  isFavorite: (businessId: string) => boolean;
  isPending: (businessId: string) => boolean;
  /** Loads the favorites once; later calls do nothing until reset. */
  ensureLoaded: () => void;
  /** Re-reads every favorite from the API (pull-to-refresh, retry). A failed refresh keeps the list on screen. */
  reload: () => Promise<void>;
  /** Adds or removes the business, updating every screen right away and rolling back if the API fails. */
  toggle: (business: Business) => Promise<void>;
  /** Forgets the loaded favorites. Also done by the provider itself whenever the session is cleared. */
  reset: () => void;
  /** Hides the last action error, so a failure on one screen doesn't follow the user to the next. */
  clearActionError: () => void;
}

// The contract's max pageSize; a client has few favorites, so this is usually a single request.
const PAGE_SIZE = 100;
// A hard stop for the page loop, so a server that misreports totalPages can't make it run forever.
const MAX_PAGES = 20;
const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';
const GENERIC_ERROR = 'No se pudo completar la acción. Intentá de nuevo.';

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/** The API's order: createdAt descending, then businessId. */
function newestFirst(a: FavoriteBusiness, b: FavoriteBusiness): number {
  return b.createdAt.localeCompare(a.createdAt) || a.businessId.localeCompare(b.businessId);
}

/** Every favorite, de-duplicated by business (the list can shift between pages), at most MAX_PAGES pages. */
async function fetchAllFavorites(): Promise<FavoriteBusiness[]> {
  const byBusiness = new Map<string, FavoriteBusiness>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await listFavoriteBusinesses(authClient, { page, pageSize: PAGE_SIZE });
    for (const favorite of result.data) {
      if (!byBusiness.has(favorite.businessId)) byBusiness.set(favorite.businessId, favorite);
    }
    if (result.data.length === 0 || page >= result.pagination.totalPages) return [...byBusiness.values()];
  }
  console.warn(`Favorites: stopped at ${MAX_PAGES} pages; the list may be incomplete.`);
  return [...byBusiness.values()];
}

/**
 * A message in Spanish for a failed request. The API's own message is shown only for a 4xx that came
 * with an Error body (the backend writes those in Spanish); a bare status text such as "Bad Gateway",
 * or a 5xx, becomes a generic message, and only a failed fetch is reported as a connection problem.
 */
function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Solo las cuentas de cliente pueden guardar favoritos.';
    const isClientError = error.status >= 400 && error.status < 500;
    return isClientError && error.code !== 'UNKNOWN_ERROR' ? error.message : GENERIC_ERROR;
  }
  // fetch rejects with a TypeError when the server can't be reached; anything else is a bug worth seeing.
  if (error instanceof TypeError) return NETWORK_ERROR;
  console.warn('Favorites: unexpected error.', error);
  return GENERIC_ERROR;
}

interface PendingToggle {
  business: Business;
  wantFavorite: boolean;
}

/** A load can finish while a toggle is still in flight: put that toggle's outcome on top of the server's list. */
function withPendingToggles(
  loaded: FavoriteBusiness[],
  pending: ReadonlyMap<string, PendingToggle>,
): FavoriteBusiness[] {
  let result = loaded;
  for (const [businessId, { business, wantFavorite }] of pending) {
    const present = result.some((f) => f.businessId === businessId);
    if (wantFavorite && !present) {
      result = [{ businessId, createdAt: new Date().toISOString(), business }, ...result];
    } else if (!wantFavorite && present) {
      result = result.filter((f) => f.businessId !== businessId);
    }
  }
  return result;
}

/**
 * Single source of truth for the client's favorite businesses, so the favorites list, search
 * results and business detail all show the same state (#28).
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<FavoritesStatus>('idle');
  const [favorites, setFavorites] = useState<FavoriteBusiness[]>([]);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  // Bumped by reset(), so a request that was in flight at logout can't touch the next session.
  const generation = useRef(0);
  const statusRef = useRef<FavoritesStatus>('idle');
  // Refs mirror the state a toggle needs, so two taps in the same frame can't read a stale closure.
  const favoritesRef = useRef<FavoriteBusiness[]>([]);
  const pendingRef = useRef(new Map<string, PendingToggle>());
  // Counts every toggle start and finish, so a reload can tell its answer went stale while it was loading.
  const toggleEpoch = useRef(0);

  const updateStatus = useCallback((next: FavoritesStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const applyFavorites = useCallback((update: (now: FavoriteBusiness[]) => FavoriteBusiness[]) => {
    favoritesRef.current = update(favoritesRef.current);
    setFavorites(favoritesRef.current);
  }, []);

  const syncPendingIds = useCallback(() => {
    setPendingIds(new Set(pendingRef.current.keys()));
  }, []);

  const reload = useCallback(async () => {
    const current = generation.current;
    // A refresh over a list that is already on screen doesn't blank it out.
    const hadList = statusRef.current === 'ready';
    let startEpoch = toggleEpoch.current;
    if (!hadList) updateStatus('loading');
    try {
      let all = await fetchAllFavorites();
      // A toggle that started or finished while the list was loading makes that answer stale (it may
      // not include it): ask again, a couple of times at most, before applying what is still pending.
      for (let retry = 0; retry < 2 && current === generation.current && toggleEpoch.current !== startEpoch; retry++) {
        startEpoch = toggleEpoch.current;
        all = await fetchAllFavorites();
      }
      if (current !== generation.current) return;
      applyFavorites(() => withPendingToggles(all, pendingRef.current));
      updateStatus('ready');
      if (hadList) setActionError(null);
    } catch (error) {
      if (current !== generation.current) return;
      if (error instanceof ApiError && error.status === 403) updateStatus('forbidden');
      else if (hadList) setActionError(messageFor(error));
      else updateStatus('error');
    }
  }, [applyFavorites, updateStatus]);

  // Also retries after a failed load, so a heart on another screen doesn't stay disabled until the
  // user happens to open the favorites. Callers run it once, when they mount.
  const ensureLoaded = useCallback(() => {
    if (statusRef.current === 'idle' || statusRef.current === 'error') void reload();
  }, [reload]);

  const reset = useCallback(() => {
    generation.current++;
    pendingRef.current.clear();
    applyFavorites(() => []);
    setPendingIds(new Set());
    setActionError(null);
    updateStatus('idle');
  }, [applyFavorites, updateStatus]);

  // The next account must never see this one's favorites: a logout, or a refresh that failed, clears them.
  useEffect(() => onSessionCleared(reset), [reset]);

  const clearActionError = useCallback(() => setActionError(null), []);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.businessId)), [favorites]);
  const isFavorite = useCallback((businessId: string) => favoriteIds.has(businessId), [favoriteIds]);
  const isPending = useCallback((businessId: string) => pendingIds.has(businessId), [pendingIds]);

  const toggle = useCallback(
    async (business: Business) => {
      // Checked on a ref, not on state: a second tap in the same frame must see the first one.
      if (pendingRef.current.has(business.id)) return;
      const current = generation.current;
      const original = favoritesRef.current.find((f) => f.businessId === business.id);
      const wasFavorite = original !== undefined;

      setActionError(null);
      pendingRef.current.set(business.id, { business, wantFavorite: !wasFavorite });
      toggleEpoch.current++;
      syncPendingIds();
      // Optimistic: every screen reflects the change right away.
      applyFavorites((now) =>
        wasFavorite
          ? now.filter((f) => f.businessId !== business.id)
          : [{ businessId: business.id, createdAt: new Date().toISOString(), business }, ...now],
      );

      try {
        if (wasFavorite) await removeFavoriteBusiness(authClient, business.id);
        else await addFavoriteBusiness(authClient, business.id);
      } catch (error) {
        if (current !== generation.current) return;
        // Removing something that is already gone (404) is what the user wanted: nothing to undo.
        if (wasFavorite && error instanceof ApiError && error.status === 404) return;
        // Undo only this business, so a concurrent toggle of another one isn't lost.
        applyFavorites((now) => {
          const without = now.filter((f) => f.businessId !== business.id);
          return original ? [...without, original].sort(newestFirst) : without;
        });
        setActionError(
          error instanceof ApiError && error.status === 404 ? `“${business.name}” ya no está disponible.` : messageFor(error),
        );
      } finally {
        if (current === generation.current) {
          pendingRef.current.delete(business.id);
          toggleEpoch.current++;
          syncPendingIds();
        }
      }
    },
    [applyFavorites, syncPendingIds],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      status,
      favorites,
      actionError,
      isFavorite,
      isPending,
      ensureLoaded,
      reload,
      toggle,
      reset,
      clearActionError,
    }),
    [status, favorites, actionError, isFavorite, isPending, ensureLoaded, reload, toggle, reset, clearActionError],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used inside <FavoritesProvider>.');
  return context;
}
