import { useRef } from 'react';
import { router } from 'expo-router';
import { createTapGuard } from './businessDisplay';

/**
 * Opens a business's detail screen. A quick double tap would stack the screen twice, and "Volver"
 * would land on the same business, so taps within DOUBLE_TAP_MS of the last one are ignored.
 */
export function useOpenBusiness(businessId: string): () => void {
  const guard = useRef(createTapGuard());
  return () => {
    if (!guard.current(Date.now())) return;
    router.push({ pathname: '/business/[businessId]', params: { businessId } });
  };
}
