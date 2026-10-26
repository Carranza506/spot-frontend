import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { color, listOwnNotifications, markNotificationRead, type components } from '@spot/shared';
import { authClient } from '@/api/client';
import { PrimaryButton } from '@/components/PrimaryButton';

type Notification = components['schemas']['Notification'];

// shortcut: shows the latest 50 only; add paging (onEndReached) once users accumulate more.
const PAGE_SIZE = 50;

const dateFormat = new Intl.DateTimeFormat('es-CR', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Costa_Rica',
});

/** Notificaciones: the user's notifications, newest first; tapping an unread one marks it read. */
export default function NotificationsScreen() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // One PATCH per notification at a time, so a double tap can't send two.
  const pending = useRef(new Set<string>());

  const load = useCallback(async () => {
    try {
      const page = await listOwnNotifications(authClient, { pageSize: PAGE_SIZE });
      setNotifications(page.data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  function retry() {
    setStatus('loading');
    void load();
  }

  async function markRead(notification: Notification) {
    if (notification.isRead || pending.current.has(notification.id)) return;
    pending.current.add(notification.id);
    setActionError(null);
    const setRead = (isRead: boolean) =>
      setNotifications((now) => now.map((n) => (n.id === notification.id ? { ...n, isRead } : n)));
    setRead(true); // optimistic
    try {
      await markNotificationRead(authClient, notification.id);
    } catch {
      setRead(false);
      setActionError('No se pudo marcar como leída. Intentá de nuevo.');
    } finally {
      pending.current.delete(notification.id);
    }
  }

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.back}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Notificaciones
        </Text>
        {status === 'ready' && unread > 0 && (
          <Text style={styles.count}>{unread === 1 ? '1 sin leer' : `${unread} sin leer`}</Text>
        )}
      </View>

      {actionError && <Text style={styles.actionError}>{actionError}</Text>}

      {status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={color.accentTeal} />
        </View>
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.message}>No se pudieron cargar tus notificaciones.</Text>
          <PrimaryButton title="Reintentar" onPress={retry} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow notification={item} onPress={() => void markRead(item)} />}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={color.accentTeal} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No tenés notificaciones</Text>
              <Text style={styles.message}>Acá vas a ver los cambios en tus reservaciones.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function NotificationRow({ notification, onPress }: { notification: Notification; onPress: () => void }) {
  const { title, body, isRead, createdAt } = notification;
  return (
    <Pressable
      onPress={onPress}
      disabled={isRead}
      accessibilityRole="button"
      accessibilityLabel={`${isRead ? '' : 'Sin leer. '}${title}. ${body}`}
      accessibilityHint={isRead ? undefined : 'Marca la notificación como leída.'}
      style={[styles.card, !isRead && styles.cardUnread]}
    >
      <View style={styles.headerRow}>
        {!isRead && <View style={styles.dot} />}
        <Text style={[styles.name, !isRead && styles.nameUnread]} numberOfLines={2}>
          {title}
        </Text>
      </View>
      <Text style={styles.body}>{body}</Text>
      <Text style={styles.date}>{dateFormat.format(new Date(createdAt))}</Text>
    </Pressable>
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
  back: {
    fontSize: 16,
    fontWeight: '600',
    color: color.accentTeal,
    marginBottom: 8,
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
  card: {
    gap: 6,
    padding: 16,
    borderRadius: 20,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  cardUnread: {
    borderColor: color.accentTeal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.accentTeal,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: color.textPrimary,
  },
  nameUnread: {
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: color.textSecondary,
  },
  date: {
    fontSize: 13,
    color: color.textSecondary,
  },
});
