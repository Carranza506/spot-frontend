import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ApiError,
  allowedBookingActions,
  cancelBooking,
  color,
  getBusiness,
  listOwnBookings,
  type components,
} from '@spot/shared';
import { authClient } from '@/api/client';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Chip } from '@/search/Chip';

type Booking = components['schemas']['Booking'];
type BookingStatus = components['schemas']['BookingStatus'];
type Pagination = components['schemas']['PaginationMeta'];

type ListState =
  | { status: 'loading' }
  | {
      status: 'ready';
      bookings: Booking[];
      pagination: Pagination;
      loadingMore: boolean;
      /** A failed "Cargar más": shown under the list, which stays on screen. */
      loadMoreError: string | null;
    }
  | { status: 'error'; message: string };

const PAGE_SIZE = 20;
const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

const FILTERS: { label: string; status: BookingStatus | null; empty: string }[] = [
  { label: 'Todas', status: null, empty: 'Todavía no tenés reservas' },
  { label: 'Pendientes', status: 'PENDING', empty: 'No tenés reservas pendientes' },
  { label: 'Confirmadas', status: 'CONFIRMED', empty: 'No tenés reservas confirmadas' },
  { label: 'Completadas', status: 'COMPLETED', empty: 'No tenés reservas completadas' },
  { label: 'Canceladas', status: 'CANCELLED', empty: 'No tenés reservas canceladas' },
  { label: 'No asistió', status: 'NO_SHOW', empty: 'No tenés reservas en las que no asististe' },
];

// Every business's schedule is in Costa Rica time (see Spot.Booking.Api's BusinessTimeZone), so a
// booking's date and time are shown in that zone, whatever zone the phone is set to.
const BUSINESS_TIME_ZONE = 'America/Costa_Rica';
// Costa Rica has had no daylight saving time since 1992: the fallback below relies on it.
const BUSINESS_UTC_OFFSET_HOURS = -6;

type DateFormatters = { day: Intl.DateTimeFormat; time: Intl.DateTimeFormat } | null;
let dateFormatters: DateFormatters | undefined;

/**
 * Built on first use, not when the module loads: an engine without time zone support (Hermes on some
 * Android builds) throws here, and that must cost the formatting, not the whole screen.
 */
function getDateFormatters(): DateFormatters {
  if (dateFormatters === undefined) {
    try {
      dateFormatters = {
        day: new Intl.DateTimeFormat('es-CR', {
          timeZone: BUSINESS_TIME_ZONE,
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        time: new Intl.DateTimeFormat('es-CR', { timeZone: BUSINESS_TIME_ZONE, hour: 'numeric', minute: '2-digit' }),
      };
    } catch {
      dateFormatters = null;
    }
  }
  return dateFormatters;
}

/** "viernes, 31 de octubre de 2026 a las 9:00 a. m.", in Costa Rica time. */
function formatBookingStart(startAt: string): string {
  const date = new Date(startAt);
  const formatters = getDateFormatters();
  if (formatters) return `${formatters.day.format(date)} a las ${formatters.time.format(date)}`;
  // No Intl time zones: shift to Costa Rica by hand and read the result as UTC.
  const local = new Date(date.getTime() + BUSINESS_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()} a las ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

/** Cancel only where the backend allows it, and not once the booking's time has passed. */
function canCancel(booking: Booking, now: number): boolean {
  return allowedBookingActions(booking.status).includes('cancel') && new Date(booking.startAt).getTime() > now;
}

/** The message for a failed cancel, by the API's status: each one tells the user what happened. */
function cancelErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return NETWORK_ERROR;
  if (error.status === 403) return 'No podés cancelar esta reserva.';
  if (error.status === 404) return 'Esta reserva ya no existe.';
  if (error.code === 'BOOKING_INVALID_STATUS_TRANSITION' || error.status === 422) {
    return 'Esta reserva ya cambió de estado, así que no se puede cancelar.';
  }
  return 'No se pudo cancelar la reserva. Intentá de nuevo.';
}

/** Mis reservas: the client's own bookings, newest first, filtered by status, with cancel where it applies (#26). */
export default function BookingsScreen() {
  const [filter, setFilter] = useState<BookingStatus | null>(null);
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [businessNames, setBusinessNames] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Bumped per load, so a slow response for an older filter can't overwrite a newer one.
  const loadId = useRef(0);
  // Each business is asked for once, whatever page or filter brought it in.
  const requestedBusinessIds = useRef(new Set<string>());

  /** The booking has no business name: fetch each business not seen yet (public endpoint). */
  const loadBusinessNames = useCallback((bookings: Booking[]) => {
    const missing = [...new Set(bookings.map((b) => b.businessId))].filter((id) => !requestedBusinessIds.current.has(id));
    for (const businessId of missing) {
      requestedBusinessIds.current.add(businessId);
      getBusiness(authClient, businessId)
        .then((business) => setBusinessNames((names) => ({ ...names, [businessId]: business.name })))
        // The card still shows the service and time; asked again on the next pull to refresh.
        .catch(() => requestedBusinessIds.current.delete(businessId));
    }
  }, []);

  const handleListError = useCallback((error: unknown): string => {
    if (error instanceof ApiError && error.status === 401) {
      router.replace('/');
      return '';
    }
    return error instanceof ApiError ? 'No se pudieron cargar tus reservas.' : NETWORK_ERROR;
  }, []);

  const loadFirstPage = useCallback(
    async (status: BookingStatus | null, { keepList = false } = {}) => {
      const id = ++loadId.current;
      setConfirmingId(null);
      if (!keepList) setList({ status: 'loading' });
      try {
        const page = await listOwnBookings(authClient, { page: 1, pageSize: PAGE_SIZE, status: status ?? undefined });
        if (id !== loadId.current) return;
        setList({ status: 'ready', bookings: page.data, pagination: page.pagination, loadingMore: false, loadMoreError: null });
        loadBusinessNames(page.data);
      } catch (error) {
        if (id === loadId.current) setList({ status: 'error', message: handleListError(error) });
      }
    },
    [handleListError, loadBusinessNames],
  );

  useEffect(() => {
    void loadFirstPage(filter);
  }, [filter, loadFirstPage]);

  function selectFilter(status: BookingStatus | null) {
    setActionError(null);
    setFilter(status);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setActionError(null);
    try {
      await loadFirstPage(filter, { keepList: true });
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (list.status !== 'ready' || list.loadingMore) return;
    const id = loadId.current;
    const nextPage = list.pagination.page + 1;
    setList({ ...list, loadingMore: true, loadMoreError: null });
    try {
      const page = await listOwnBookings(authClient, { page: nextPage, pageSize: PAGE_SIZE, status: filter ?? undefined });
      if (id !== loadId.current) return;
      setList((current) => {
        if (current.status !== 'ready') return current;
        // Pages can overlap if a booking was added meanwhile; keep each one once (unique keys).
        const seen = new Set(current.bookings.map((b) => b.id));
        const added = page.data.filter((b) => !seen.has(b.id));
        return { ...current, bookings: [...current.bookings, ...added], pagination: page.pagination, loadingMore: false };
      });
      loadBusinessNames(page.data);
    } catch (error) {
      if (id !== loadId.current) return;
      const message = handleListError(error);
      // Keep what's already listed; the error goes under it and "Cargar más" can be tapped again.
      setList((current) =>
        current.status === 'ready' ? { ...current, loadingMore: false, loadMoreError: message || null } : current,
      );
    }
  }

  async function handleCancel(booking: Booking) {
    setActionError(null);
    setCancellingId(booking.id);
    try {
      const cancelled = await cancelBooking(authClient, booking.id);
      // Shown as Cancelada in place, even under another filter, so the user sees it worked.
      setList((current) =>
        current.status === 'ready'
          ? { ...current, bookings: current.bookings.map((b) => (b.id === cancelled.id ? cancelled : b)) }
          : current,
      );
      setConfirmingId(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace('/');
        return;
      }
      setActionError(cancelErrorMessage(error));
      // The list is stale: the booking is gone or already changed status (e.g. the business cancelled it).
      if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
        void loadFirstPage(filter, { keepList: true });
      }
    } finally {
      setCancellingId(null);
    }
  }

  const now = Date.now();
  const activeFilter = FILTERS.find((f) => f.status === filter) ?? FILTERS[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          style={styles.backButton}
          role="button"
          aria-label="Volver"
        >
          <Text style={styles.back}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title} role="heading" aria-level={1}>
          Mis reservas
        </Text>
        {/* Always mounted, only its text changes: a live region has to exist before its content does. */}
        <Text style={styles.count} role="status" accessibilityLiveRegion="polite">
          {list.status === 'ready' && list.pagination.total > 0
            ? `${list.pagination.total} ${list.pagination.total === 1 ? 'reserva' : 'reservas'}`
            : ''}
        </Text>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <Chip key={f.label} label={f.label} selected={f.status === filter} onPress={() => selectFilter(f.status)} />
          ))}
        </ScrollView>
      </View>

      {actionError && (
        <Text style={styles.actionError} role="alert" accessibilityLiveRegion="assertive">
          {actionError}
        </Text>
      )}

      {list.status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={color.accentTeal} />
        </View>
      ) : list.status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.message}>{list.message}</Text>
          <PrimaryButton title="Reintentar" onPress={() => void loadFirstPage(filter)} />
        </View>
      ) : (
        <FlatList
          data={list.bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              businessName={businessNames[item.businessId]}
              cancellable={canCancel(item, now)}
              confirming={confirmingId === item.id}
              cancelling={cancellingId === item.id}
              onAskCancel={() => {
                setActionError(null);
                setConfirmingId(item.id);
              }}
              onKeep={() => setConfirmingId(null)}
              onConfirmCancel={() => void handleCancel(item)}
            />
          )}
          contentContainerStyle={list.bookings.length === 0 ? styles.emptyContainer : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={color.accentTeal} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle} role="heading" aria-level={2}>
                {activeFilter.empty}
              </Text>
              {filter === null ? (
                <Text style={styles.message}>Buscá un negocio y reservá tu primera cita.</Text>
              ) : null}
            </View>
          }
          ListFooterComponent={
            list.pagination.page < list.pagination.totalPages || list.loadMoreError ? (
              <View style={styles.footer}>
                {list.loadMoreError ? (
                  <Text style={styles.actionError} role="alert">
                    {list.loadMoreError}
                  </Text>
                ) : null}
                <PrimaryButton title="Cargar más" onPress={() => void loadMore()} loading={list.loadingMore} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

interface BookingCardProps {
  booking: Booking;
  businessName: string | undefined;
  cancellable: boolean;
  confirming: boolean;
  cancelling: boolean;
  onAskCancel: () => void;
  onKeep: () => void;
  onConfirmCancel: () => void;
}

function BookingCard({
  booking,
  businessName,
  cancellable,
  confirming,
  cancelling,
  onAskCancel,
  onKeep,
  onConfirmCancel,
}: BookingCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.serviceName} numberOfLines={2}>
          {booking.serviceName}
        </Text>
        <StatusBadge status={booking.status} />
      </View>
      {/* A ternary, not `&&`: an empty string would render as a bare text node, which crashes on native. */}
      {businessName ? (
        <Text style={styles.businessName} numberOfLines={1}>
          {businessName}
        </Text>
      ) : null}
      <Text style={styles.cardText}>{formatBookingStart(booking.startAt)}</Text>
      <Text style={styles.cardMeta}>{booking.serviceDurationMinutes} min</Text>

      {/* #29 (Jeremy): the "Reseñar" button for COMPLETED bookings without a review goes here. */}

      {cancellable && !confirming ? (
        <Pressable onPress={onAskCancel} style={styles.cancelButton} role="button">
          <Text style={styles.cancelText}>Cancelar reserva</Text>
        </Pressable>
      ) : null}
      {/* Asked inline, not with Alert.alert: on Expo web an alert's buttons never show up. */}
      {cancellable && confirming ? (
        <View style={styles.confirm}>
          <Text style={styles.cardText}>¿Cancelar esta reserva? No se puede deshacer.</Text>
          <PrimaryButton title="Sí, cancelar" onPress={onConfirmCancel} loading={cancelling} />
          <Pressable onPress={onKeep} disabled={cancelling} style={styles.keepButton} role="button">
            <Text style={styles.keepText}>No, mantenerla</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const BADGE_COLORS: Record<BookingStatus, { text: string; background: string }> = {
  PENDING: { text: color.warningText, background: color.warningBg },
  CONFIRMED: { text: color.success, background: color.successBg },
  COMPLETED: { text: color.onPanelDark, background: color.accentTeal },
  CANCELLED: { text: color.textSecondary, background: color.surfaceMuted },
  NO_SHOW: { text: color.danger, background: color.surfaceMuted },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const colors = BADGE_COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 4,
  },
  // 44 x 44 on every platform, and not stretched across the header.
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  back: {
    fontSize: 16,
    fontWeight: '600',
    color: color.accentTeal,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: color.textPrimary,
  },
  count: {
    fontSize: 14,
    color: color.textSecondary,
  },
  filterRow: {
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  actionError: {
    marginHorizontal: 24,
    marginBottom: 8,
    fontSize: 14,
    color: color.danger,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  message: {
    fontSize: 15,
    color: color.textSecondary,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: color.textPrimary,
    textAlign: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  separator: {
    height: 12,
  },
  footer: {
    paddingTop: 12,
  },
  card: {
    gap: 4,
    padding: 16,
    borderRadius: 20,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: color.textPrimary,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '600',
    color: color.textSecondary,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: color.textPrimary,
  },
  cardMeta: {
    fontSize: 14,
    fontWeight: '600',
    color: color.accentTeal,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // 44 tall so it's easy to hit, and only as wide as its text.
  cancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: color.danger,
  },
  confirm: {
    marginTop: 8,
    gap: 4,
  },
  keepButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keepText: {
    fontSize: 15,
    fontWeight: '600',
    color: color.accentTeal,
  },
});
