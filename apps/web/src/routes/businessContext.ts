import { useOutletContext } from 'react-router-dom';
import type { components } from '@spot/shared';

type Business = components['schemas']['Business'];

/** Outlet context BusinessGuard hands to the dashboard routes once the business is loaded. */
export interface BusinessContext {
  business: Business;
  /** Replaces the loaded business, e.g. after an update, so the dashboard header stays in sync. */
  setBusiness: (business: Business) => void;
}

export function useBusinessContext(): BusinessContext {
  return useOutletContext<BusinessContext>();
}
