import type { components } from '@spot/shared';

type PlanFeatures = components['schemas']['PlanFeatures'];
type BillingInterval = components['schemas']['BillingInterval'];
type SubscriptionStatus = components['schemas']['SubscriptionStatus'];
type PaymentStatus = components['schemas']['PaymentStatus'];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Activa',
  PAST_DUE: 'Pago pendiente',
  CANCELED: 'Cancelada',
  EXPIRED: 'Vencida',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAID: 'Pagado',
  FAILED: 'Fallido',
};

export const INTERVAL_LABELS: Record<BillingInterval, string> = {
  MONTHLY: 'mes',
};

/** PlanFeatures in display order; `null` means the plan sets no limit. */
export function featureLines(features: PlanFeatures): string[] {
  return [
    features.maxServices === null ? 'Servicios ilimitados' : `Hasta ${features.maxServices} servicios activos`,
    features.maxPhotosPerBusiness === null
      ? 'Fotos del negocio ilimitadas'
      : `Hasta ${features.maxPhotosPerBusiness} fotos del negocio`,
    features.maxPhotosPerService === null
      ? 'Fotos por servicio ilimitadas'
      : `Hasta ${features.maxPhotosPerService} fotos por servicio`,
  ];
}

const dateFormat = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}
