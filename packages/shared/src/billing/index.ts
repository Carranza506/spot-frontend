import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type Plan = components['schemas']['Plan'];
type PlanCode = components['schemas']['PlanCode'];
type Subscription = components['schemas']['Subscription'];
type CheckoutSessionResponse = components['schemas']['CheckoutSessionResponse'];
type PaginatedSubscriptionPayments = components['schemas']['PaginatedSubscriptionPayments'];

export interface BillingPaymentsFilter {
  page?: number;
  pageSize?: number;
}

/** The active plans, cheapest first (public endpoint). */
export function listPlans(client: Pick<ApiClient, 'apiFetch'>): Promise<Plan[]> {
  return client.apiFetch<Plan[]>('/business/billing/plans');
}

/** The caller's effective plan; on FREE, `id`, `status` and `currentPeriodEnd` are null. */
export function getMySubscription(client: Pick<ApiClient, 'apiFetch'>): Promise<Subscription> {
  return client.apiFetch<Subscription>('/business/billing/subscription');
}

/**
 * Starts a Stripe Checkout session for a paid plan and returns the hosted page to redirect to.
 * 409 ALREADY_SUBSCRIBED when the caller already has an ACTIVE/PAST_DUE subscription to it.
 */
export function createCheckoutSession(
  client: Pick<ApiClient, 'apiFetch'>,
  planCode: PlanCode,
): Promise<CheckoutSessionResponse> {
  return client.apiFetch<CheckoutSessionResponse>('/business/billing/checkout', {
    method: 'POST',
    body: { planCode },
  });
}

/** Sets the subscription to cancel at the end of the period (idempotent; 404 without an ACTIVE/PAST_DUE one). */
export function cancelMySubscription(client: Pick<ApiClient, 'apiFetch'>): Promise<Subscription> {
  return client.apiFetch<Subscription>('/business/billing/subscription/cancel', { method: 'POST' });
}

/** A page of the caller's subscription payments: paid ones first (most recent first), failed ones last. */
export function listMyPayments(
  client: Pick<ApiClient, 'apiFetch'>,
  { page = 1, pageSize = 20 }: BillingPaymentsFilter = {},
): Promise<PaginatedSubscriptionPayments> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return client.apiFetch<PaginatedSubscriptionPayments>(`/business/billing/payments?${query}`);
}
