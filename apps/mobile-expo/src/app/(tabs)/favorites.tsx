import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, type components } from '@spot/shared';
import { requireSession } from '@/auth/sessionGates';
import { BusinessLinkArea } from '@/components/business/BusinessLinkArea';
import { ErrorMessage } from '@/components/ErrorMessage';
import { PrimaryButton } from '@/components/PrimaryButton';
import { FavoriteButton } from '@/favorites/FavoriteButton';
import { useFavorites } from '@/favorites/FavoritesProvider';
import { font } from '@/theme/fonts';

type FavoriteBusiness = components['schemas']['FavoriteBusiness'];

/** Mis favoritos: the client's saved businesses, newest first, with the heart to remove one. */
function FavoritesScreen() {
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
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

      {actionError && <ErrorMessage style={styles.actionError}>{actionError}</ErrorMessage>}

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
      <BusinessLinkArea business={business} />
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
  title: {
    fontSize: 26,
    fontFamily: font.bold,
    color: color.textPrimary,
  },
  count: {
    fontSize: 14,
    fontFamily: font.regular,
    color: color.textSecondary,
  },
  actionError: {
    marginHorizontal: 24,
    marginBottom: 8,
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
    fontFamily: font.regular,
    color: color.textSecondary,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: font.bold,
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
});

export default requireSession(FavoritesScreen);
