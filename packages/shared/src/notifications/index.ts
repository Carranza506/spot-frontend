import type { ApiClient } from '../api/client';
import type { components } from '../api/schema';

type DeviceToken = components['schemas']['DeviceToken'];
type DeviceTokenRegisterRequest = components['schemas']['DeviceTokenRegisterRequest'];
type Notification = components['schemas']['Notification'];
type PaginatedNotifications = components['schemas']['PaginatedNotifications'];

export interface NotificationsFilter {
  page?: number;
  pageSize?: number;
  /** Omitted = read and unread. */
  isRead?: boolean;
}

/** Registers the caller's device push token (201); an existing inactive one is reactivated. */
export function registerDeviceToken(
  client: Pick<ApiClient, 'apiFetch'>,
  data: DeviceTokenRegisterRequest,
): Promise<DeviceToken> {
  return client.apiFetch<DeviceToken>('/notifications/device-tokens', { method: 'POST', body: data });
}

/** A page of the caller's own notifications. */
export function listOwnNotifications(
  client: Pick<ApiClient, 'apiFetch'>,
  { page = 1, pageSize = 20, isRead }: NotificationsFilter = {},
): Promise<PaginatedNotifications> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (isRead !== undefined) query.set('isRead', String(isRead));
  return client.apiFetch<PaginatedNotifications>(`/notifications?${query}`);
}

/** Marks one of the caller's notifications as read (or unread). 404 if it doesn't exist, 403 if it isn't theirs. */
export function markNotificationRead(
  client: Pick<ApiClient, 'apiFetch'>,
  notificationId: string,
  isRead = true,
): Promise<Notification> {
  return client.apiFetch<Notification>(`/notifications/${encodeURIComponent(notificationId)}`, {
    method: 'PATCH',
    body: { isRead },
  });
}
