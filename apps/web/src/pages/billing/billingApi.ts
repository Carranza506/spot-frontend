import {
  cancelMySubscription,
  createCheckoutSession,
  getMySubscription,
  listMyPayments,
  listPlans,
  type BillingPaymentsFilter,
  type components,
} from '@spot/shared';
import { authClient } from '../../api/client';

type Plan = components['schemas']['Plan'];
type PlanCode = components['schemas']['PlanCode'];
type Subscription = components['schemas']['Subscription'];
type PaginatedSubscriptionPayments = components['schemas']['PaginatedSubscriptionPayments'];

/** What the Plan views need from the billing endpoints. */
export interface BillingApi {
  listPlans(): Promise<Plan[]>;
  getSubscription(): Promise<Subscription>;
  /** Returns the Stripe Checkout URL to redirect to. */
  checkout(planCode: PlanCode): Promise<string>;
  cancelSubscription(): Promise<Subscription>;
  listPayments(filter: BillingPaymentsFilter): Promise<PaginatedSubscriptionPayments>;
}

export const billingApi: BillingApi = {
  listPlans: () => listPlans(authClient),
  getSubscription: () => getMySubscription(authClient),
  checkout: (planCode) => createCheckoutSession(authClient, planCode).then((session) => session.checkoutUrl),
  cancelSubscription: () => cancelMySubscription(authClient),
  listPayments: (filter) => listMyPayments(authClient, filter),
};
