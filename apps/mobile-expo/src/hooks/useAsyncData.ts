import { useCallback, useEffect, useState, type DependencyList } from 'react';

export type AsyncData<T> =
  | { status: 'loading' }
  | { status: 'loaded'; data: T }
  | { status: 'error'; error: unknown };

/**
 * Runs `load` on mount and whenever `deps` change; `reload` runs it again (e.g. a retry button).
 * A response that arrives after unmounting or after `deps` changed is ignored.
 */
export function useAsyncData<T>(load: () => Promise<T>, deps: DependencyList): [AsyncData<T>, () => void] {
  const [state, setState] = useState<AsyncData<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState({ status: 'loading' });
    load()
      .then((data) => !ignore && setState({ status: 'loaded', data }))
      .catch((error: unknown) => !ignore && setState({ status: 'error', error }));
    return () => {
      ignore = true;
    };
    // `load` is a new closure every render; `deps` are what it actually depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return [state, reload];
}
