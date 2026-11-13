type Listener = () => void;

const clearedListeners = new Set<Listener>();

/**
 * Calls `listener` whenever the stored session is cleared: a logout, or a refresh that failed. Lets
 * per-account state (favorites) and the navigation react without every caller having to know.
 * Returns the unsubscribe function.
 */
export function onSessionCleared(listener: Listener): () => void {
  clearedListeners.add(listener);
  return () => {
    clearedListeners.delete(listener);
  };
}

/**
 * Tells every listener, even if one of them throws: the others must still run (the favorites have
 * to be reset whatever the navigation does), and the logout or refresh that triggered this must
 * not fail because of a listener.
 */
export function emitSessionCleared(): void {
  for (const listener of [...clearedListeners]) {
    try {
      listener();
    } catch (error) {
      console.warn('A session-cleared listener failed.', error);
    }
  }
}
