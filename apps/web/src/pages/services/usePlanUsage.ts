import { useEffect, useState } from 'react';
import { billingApi } from '../billing/billingApi';
import { servicesApi } from './servicesApi';

export interface PlanUsage {
  planName: string;
  /** Active services right now. */
  active: number;
  /** The plan's maxServices; null on a plan without a limit. */
  max: number | null;
}

/**
 * The business's plan and its active services against the plan's limit, for Servicios (#95) and the
 * menu's plan card (#101). Read again whenever `refreshKey` changes. Null while loading or if it
 * failed: it's only a hint, the backend still enforces the limit (409 SERVICE_LIMIT_REACHED).
 */
export function usePlanUsage(businessId: string, refreshKey: unknown): PlanUsage | null {
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  useEffect(() => {
    let ignore = false;
    Promise.all([
      billingApi.getSubscription(),
      servicesApi.list(businessId, { page: 1, pageSize: 1, isActive: true }),
    ])
      .then(([subscription, active]) => {
        if (ignore) return;
        const { name, features } = subscription.plan;
        setUsage({ planName: name, active: active.pagination.total, max: features.maxServices ?? null });
      })
      .catch(() => !ignore && setUsage(null));
    return () => {
      ignore = true;
    };
  }, [businessId, refreshKey]);
  return usage;
}
