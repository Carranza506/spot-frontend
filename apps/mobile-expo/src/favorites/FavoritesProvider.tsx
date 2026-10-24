import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ApiError,
  addFavoriteBusiness,
  listFavoriteBusinesses,
  removeFavoriteBusiness,
  type components,
} from '@spot/shared';
import { authClient } from '@/api/client';

type Business = components['schemas']['Business'];
type FavoriteBusiness = components['schemas']['FavoriteBusiness'];

/** idle: not loaded yet (or reset on logout). forbidden: the account isn't a CLIENT (403). */
export type FavoritesStatus = 'idle' | 'loading' | 'ready' | 'error' | 'forbidden';

interface FavoritesContextValue {
  status: FavoritesStatus;
  /** Newest first, as the API returns them. */
  favorites: FavoriteBusiness[];
  /** The last add/remove that failed, for the screen to show; cleared on the next toggle. */
  actionError: string | null;
  isFavorite: (businessId: string) => boolean;
  isPending: (businessId: string) => boolean;
  /** Loads the favorites once; later calls do nothing until reset. */
  ensureLoaded: () => void;
  /** Re-reads every favorite from the API (pull-to-refresh, retry). */
  reload: () => Promise<void>;
  /** Adds or removes the business, updating every screen right away and rolling back if the API fails. */
  toggle: (business: Business) => Promise<void>;
  /** Forgets the loaded favorites, e.g. on logout so the next account starts clean. */
  reset: () => void;
}

// The contract's max pageSize; a client has few favorites, so this is usually a single request.
const PAGE_SIZE = 100;
const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/** The API's order: createdAt descending, then businessId. */
function newestFirst(a: FavoriteBusiness, b: FavoriteBusiness): number {
  return b.createdAt.localeCompare(a.createdAt) || a.businessId.localeCompare(b.businessId);
}

async function fetchAllFavorites(): Promise<FavoriteBusiness[]> {
  const all: FavoriteBusiness[] = [];
  for (let page = 1; ; page++) {
    const result = await listFavoriteBusinesses(authClient, { page, pageSize: PAGE_SIZE });
    all.push(...result.data);
    if (page >= result.pagination.totalPages) return all;
  }
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
  // Bumped by reset(), so a load that was in flight at logout can't fill the next session.
  const generation = useRef(0);
  const statusRef = useRef<FavoritesStatus>('idle');

  const updateStatus = useCallback((next: FavoritesStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const reload = useCallback(async () => {
    const current = generation.current;
    updateStatus('loading');
    try {
      const all = await fetchAllFavorites();
      if (current !== generation.current) return;
      setFavorites(all);
      updateStatus('ready');
    } catch (error) {
      if (current !== generation.current) return;
      updateStatus(error instanceof ApiError && error.status === 403 ? 'forbidden' : 'error');
    }
  }, [updateStatus]);

  const ensureLoaded = useCallback(() => {
    if (statusRef.current === 'idle') void reload();
  }, [reload]);

  const reset = useCallback(() => {
    generation.current++;
    setFavorites([]);
    setPendingIds(new Set());
    setActionError(null);
    updateStatus('idle');
  }, [updateStatus]);

  const setPending = useCallback((businessId: string, pending: boolean) => {
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) next.add(businessId);
      else next.delete(businessId);
      return next;
    });
  }, []);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.businessId)), [favorites]);
  const isFavorite = useCallback((businessId: string) => favoriteIds.has(businessId), [favoriteIds]);
  const isPending = useCallback((businessId: string) => pendingIds.has(businessId), [pendingIds]);

  const toggle = useCallback(
    async (business: Business) => {
      if (pendingIds.has(business.id)) return;
      const current = generation.current;
      const wasFavorite = favoriteIds.has(business.id);
      const previous = favorites;

      setActionError(null);
      setPending(business.id, true);
      // Optimistic: every screen reflects the change right away.
      setFavorites((now) =>
        wasFavorite
          ? now.filter((f) => f.businessId !== business.id)
          : [{ businessId: business.id, createdAt: new Date().toISOString(), business }, ...now],
      );

      try {
        if (wasFavorite) await removeFavoriteBusiness(authClient, business.id);
        else await addFavoriteBusiness(authClient, business.id);
      } catch (error) {
        if (current !== generation.current) return;
        // Undo only this business, so a concurrent toggle of another one isn't lost.
        setFavorites((now) => {
          const without = now.filter((f) => f.businessId !== business.id);
          const original = previous.find((f) => f.businessId === business.id);
          return original ? [...without, original].sort(newestFirst) : without;
        });
        if (error instanceof ApiError && error.status === 404) {
          setActionError(`“${business.name}” ya no está disponible.`);
        } else if (error instanceof ApiError && error.status === 403) {
          setActionError('Solo las cuentas de cliente pueden guardar favoritos.');
        } else {
          setActionError(error instanceof ApiError ? error.message : NETWORK_ERROR);
        }
      } finally {
        if (current === generation.current) setPending(business.id, false);
      }
    },
    [favoriteIds, favorites, pendingIds, setPending],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ status, favorites, actionError, isFavorite, isPending, ensureLoaded, reload, toggle, reset }),
    [status, favorites, actionError, isFavorite, isPending, ensureLoaded, reload, toggle, reset],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used inside <FavoritesProvider>.');
  return context;
}
