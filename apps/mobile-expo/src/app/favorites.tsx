import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { color, type components } from '@spot/shared';
import { PrimaryButton } from '@/components/PrimaryButton';
import { FavoriteButton } from '@/favorites/FavoriteButton';
import { useFavorites } from '@/favorites/FavoritesProvider';

type FavoriteBusiness = components['schemas']['FavoriteBusiness'];

/** Mis favoritos: the client's saved businesses, newest first, with the heart to remove one. */
export default function FavoritesScreen() {
  const { status, favorites, actionError, ensureLoaded, reload, clearActionError } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(ensureLoaded, [ensureLoaded]);

  // An error from another screen isn't news here, and this screen's own error shouldn't follow the user out.
  useEffect(() => {
    clearActionError();
    return clearActionError;
  }, [clearActionError]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }

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
          Mis favoritos
        </Text>
        {/* Always mounted, only its text changes: a live region has to exist before its content does. */}
        <Text style={styles.count} role="status" accessibilityLiveRegion="polite">
          {status === 'ready' && favorites.length > 0
            ? `${favorites.length} ${favorites.length === 1 ? 'negocio guardado' : 'negocios guardados'}`
            : ''}
        </Text>
      </View>

      {actionError && (
        <Text style={styles.actionError} role="alert" accessibilityLiveRegion="assertive">
          {actionError}
        </Text>
      )}

      {status === 'idle' || (status === 'loading' && !refreshing) ? (
        <View style={styles.center}>
          <ActivityIndicator color={color.accentTeal} />
        </View>
      ) : status === 'forbidden' ? (
        <View style={styles.center}>
          <Text style={styles.message}>Los favoritos son para cuentas de cliente.</Text>
        </View>
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.message}>No se pudieron cargar tus favoritos.</Text>
          <PrimaryButton title="Reintentar" onPress={() => void reload()} />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.businessId}
          renderItem={({ item }) => <FavoriteRow favorite={item} />}
          contentContainerStyle={favorites.length === 0 ? styles.emptyContainer : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={color.accentTeal} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle} role="heading" aria-level={2}>
                Todavía no tenés favoritos
              </Text>
              <Text style={styles.message}>Tocá el corazón en un negocio para guardarlo aquí.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function FavoriteRow({ favorite }: { favorite: FavoriteBusiness }) {
  const { business } = favorite;
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        {/* Array.from keeps an emoji or other surrogate pair whole; charAt would cut it in half. */}
        <Text style={styles.avatarText}>{(Array.from(business.name.trim())[0] ?? '?').toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {business.name}
        </Text>
        {/* A ternary, not `&&`: an empty string would render as a bare text node, which crashes on native. */}
        {business.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {business.description}
          </Text>
        ) : null}
      </View>
      <FavoriteButton business={business} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.panelDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: color.onPanelDark,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: color.textPrimary,
  },
  description: {
    fontSize: 14,
    color: color.textSecondary,
  },
});
