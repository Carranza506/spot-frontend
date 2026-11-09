import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  AI_SEARCH_QUERY_MAX_LENGTH,
  AI_SEARCH_QUERY_MIN_LENGTH,
  ApiError,
  aiSearchQuery,
  color,
  getOwnProfile,
  listCategories,
  listOwnNotifications,
  logout,
  searchBusinesses,
  type components,
} from '@spot/shared';
import { authClient } from '@/api/client';
import { rememberWrongRole } from '@/auth/wrongRole';
import { Logo } from '@/components/Logo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LogoutIcon, SearchIcon, SlidersIcon, SparkleIcon } from '@/components/icons';
import { useFavorites } from '@/favorites/FavoritesProvider';
import { BusinessCard } from '@/components/business/BusinessCard';
import { QuickActions } from '@/home/QuickActions';
import { registerForPush, unregisterPush } from '@/notifications/push';
import { Chip } from '@/search/Chip';
import { CriteriaSummary, FilterGroup, FilterLabel, NearbyToggle, PROVINCES } from '@/search/SearchFilters';
import { useBusinessSearch, type SearchResults } from '@/search/useBusinessSearch';
import { useCurrentLocation } from '@/search/useCurrentLocation';

type User = components['schemas']['User'];
type Category = components['schemas']['Category'];
type Business = components['schemas']['Business'];

type Mode = 'browse' | 'ai';

const LOGOUT_PUSH_WAIT_MS = 3000;
const PAGE_SIZE = 20;
const TYPING_DEBOUNCE_MS = 350;
const CONTENT_MAX_WIDTH = 1040;
const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';
// On web the search box draws its own focus border (searchBoxFocused), so the browser's outline
// around the bare input is dropped. RN's types don't list 'none', which react-native-web accepts.
const WEB_NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;
const AI_EXAMPLES = [
  'Un corte de cabello mañana en la tarde',
  'Una barbería con presupuesto de 10 mil colones',
  'Manicure este sábado en la mañana',
];

/** The message for a failed search; '' when it already sent the user back to the login screen. */
function describeSearchError(mode: Mode, error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    router.replace('/');
    return '';
  }
  if (error instanceof ApiError && error.status === 422) {
    // The backend needs a service, a category or a location to search with (date, time, budget
    // and a place name alone aren't enough), so point to the two ways of adding one.
    return 'No pudimos entender la búsqueda. Mencioná el servicio que buscás, activá "Cerca de mí" o explorá con filtros.';
  }
  // The gateway/service is down or the endpoint isn't deployed: its message isn't for end users.
  if (error instanceof ApiError && (error.status === 404 || error.status >= 500)) {
    return mode === 'ai'
      ? 'La búsqueda con IA no está disponible en este momento. Probá explorando con filtros.'
      : 'No pudimos cargar los negocios en este momento. Intentá de nuevo más tarde.';
  }
  return error instanceof ApiError ? error.message : NETWORK_ERROR;
}

function columnsFor(width: number): number {
  if (width >= 980) return 3;
  if (width >= 620) return 2;
  return 1;
}

/**
 * Inicio (#58): the consumer's home is where businesses are discovered. It lists active businesses
 * right away, filters them as the user types or picks a category/province/city/radius, offers the
 * natural-language (AI) search, and keeps favorites, bookings and notifications one tap away.
 */
export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const favorites = useFavorites();
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unread, setUnread] = useState(0);

  const [mode, setMode] = useState<Mode>('browse');
  const { results, run, loadMore, reset } = useBusinessSearch();
  const { location, enable: enableLocation, disable: disableLocation } = useCurrentLocation();
  const [radiusKm, setRadiusKm] = useState(10);

  // Browse mode
  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [categories, setCategories] = useState<Category[] | null>(null);
  // Bumped by "Reintentar" to repeat the browse search with the same filters.
  const [reloadKey, setReloadKey] = useState(0);
  const firstLoad = useRef(true);

  // AI mode
  const [aiQuery, setAiQuery] = useState('');
  const [aiQueryError, setAiQueryError] = useState<string | undefined>();

  const coords = location.status === 'on' ? location.coords : null;
  const latitude = coords?.latitude;
  const longitude = coords?.longitude;
  const activeFilters = (province ? 1 : 0) + (city.trim() ? 1 : 0) + (coords ? 1 : 0);
  const hasAnyFilter = activeFilters > 0 || !!categoryId || !!text.trim();

  useEffect(() => {
    getOwnProfile(authClient)
      .then((profile) => {
        // A business or admin session stored before the login screen started checking the role.
        if (profile.role !== 'CLIENT') {
          rememberWrongRole();
          // Clearing the session takes this screen back to the login, which shows the reason.
          void logout(authClient);
          return;
        }
        setUser(profile);
      })
      .catch(() => setUser(null));
    // Login and register both land here, so this is where the device gets its push token registered.
    void registerForPush();
    // Root categories only: they're the broad ones a user filters by.
    listCategories(authClient)
      .then((page) => setCategories(page.data.filter((c) => c.isActive && !c.parentCategoryId)))
      .catch(() => setCategories([]));
  }, []);

  // Coming back from Notificaciones (or anywhere else) refreshes the unread badge.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listOwnNotifications(authClient, { isRead: false, pageSize: 1 })
        .then((page) => active && setUnread(page.pagination.total))
        .catch(() => active && setUnread(0));
      return () => {
        active = false;
      };
    }, []),
  );

  // Browse: the list follows the filters, debounced so typing doesn't fire a request per key.
  useEffect(() => {
    if (mode !== 'browse') return;
    const filter = {
      q: text,
      city,
      province: province ?? undefined,
      categoryId: categoryId ?? undefined,
      ...(latitude !== undefined && longitude !== undefined ? { lat: latitude, lng: longitude, radiusKm } : {}),
    };
    const delay = firstLoad.current ? 0 : TYPING_DEBOUNCE_MS;
    firstLoad.current = false;
    const timer = setTimeout(() => {
      void run(
        async (page) => {
          const result = await searchBusinesses(authClient, { ...filter, page, pageSize: PAGE_SIZE });
          return { businesses: result.data, pagination: result.pagination };
        },
        (error) => describeSearchError('browse', error),
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [mode, text, city, province, categoryId, latitude, longitude, radiusKm, reloadKey, run]);

  function searchWithAi(query = aiQuery) {
    const trimmed = query.trim();
    if (trimmed.length < AI_SEARCH_QUERY_MIN_LENGTH) {
      setAiQueryError(`Escribí al menos ${AI_SEARCH_QUERY_MIN_LENGTH} caracteres.`);
      return;
    }
    setAiQueryError(undefined);
    // radiusKm only matters with a location; without one the backend ignores it.
    const aiLocation = coords ?? undefined;
    void run(
      async (page) => {
        const result = await aiSearchQuery(authClient, {
          query: trimmed,
          location: aiLocation,
          radiusKm,
          page,
          pageSize: PAGE_SIZE,
        });
        return { businesses: result.businesses.data, pagination: result.businesses.pagination, criteria: result.criteria };
      },
      (error) => describeSearchError('ai', error),
    );
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    // The AI mode starts empty until the user describes what they want; browse reloads its list.
    reset();
    setAiQueryError(undefined);
  }

  function clearFilters() {
    setText('');
    setCategoryId(null);
    setProvince(null);
    setCity('');
    if (coords) disableLocation();
  }

  function retry() {
    if (mode === 'browse') setReloadKey((key) => key + 1);
    else searchWithAi();
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      // Best effort: a slow or unreachable notifications service must not keep the user signed in.
      await Promise.race([unregisterPush(), new Promise((resolve) => setTimeout(resolve, LOGOUT_PUSH_WAIT_MS))]);
      await logout(authClient);
    } finally {
      // The next account must not see this one's favorites.
      favorites.reset();
      router.replace('/');
    }
  }

  const columns = columnsFor(Math.min(width, CONTENT_MAX_WIDTH));

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header: greeting, mode switch and the search box. */}
        <View style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.inner}>
              <View style={styles.topBar}>
                <Logo />
                <Pressable
                  onPress={handleLogout}
                  disabled={loggingOut}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar sesión"
                  style={({ pressed, hovered }) => [styles.logout, (hovered || pressed) && styles.logoutActive]}
                >
                  {loggingOut ? (
                    <ActivityIndicator size="small" color={color.onPanelDark} />
                  ) : (
                    <LogoutIcon size={18} color={color.onPanelDark} />
                  )}
                  <Text style={styles.logoutText}>Salir</Text>
                </Pressable>
              </View>

              <Text style={styles.greeting} role="heading" aria-level={1}>
                {user?.firstName ? `Hola, ${user.firstName}` : 'Hola'}
              </Text>
              <Text style={styles.subtitle}>¿Qué querés reservar hoy?</Text>

              <View style={styles.modeSwitch} role="tablist">
                <ModeTab label="Explorar" active={mode === 'browse'} onPress={() => switchMode('browse')} />
                <ModeTab
                  label="Buscar con IA"
                  icon={<SparkleIcon size={16} color={mode === 'ai' ? color.panelDark : color.accentAmber} />}
                  active={mode === 'ai'}
                  onPress={() => switchMode('ai')}
                />
              </View>

              {mode === 'browse' ? (
                <View style={styles.searchRow}>
                  <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
                    <SearchIcon size={20} color={color.textSecondary} />
                    <TextInput
                      value={text}
                      onChangeText={setText}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      placeholder="Buscá por nombre del negocio"
                      placeholderTextColor={color.placeholder}
                      accessibilityLabel="Buscar negocios por nombre"
                      returnKeyType="search"
                      style={[styles.searchInput, WEB_NO_OUTLINE]}
                    />
                    {text ? (
                      <Pressable onPress={() => setText('')} accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={8}>
                        <Text style={styles.clearText}>✕</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => setFiltersOpen((open) => !open)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      activeFilters ? `Filtros, ${activeFilters} ${activeFilters === 1 ? 'activo' : 'activos'}` : 'Filtros'
                    }
                    accessibilityState={{ expanded: filtersOpen }}
                    style={[styles.filterButton, filtersOpen && styles.filterButtonOpen]}
                  >
                    <SlidersIcon size={20} color={filtersOpen ? color.panelDark : color.onPanelDark} />
                    {activeFilters > 0 && (
                      <View style={styles.filterBadge}>
                        <Text style={styles.filterBadgeText}>{activeFilters}</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.aiBox}>
                  <TextInput
                    value={aiQuery}
                    onChangeText={setAiQuery}
                    placeholder="Ej.: un corte de cabello mañana en la tarde, hasta 15 mil colones"
                    placeholderTextColor={color.placeholder}
                    accessibilityLabel="Describí lo que buscás"
                    multiline
                    maxLength={AI_SEARCH_QUERY_MAX_LENGTH}
                    style={styles.aiInput}
                  />
                  {aiQueryError ? <Text style={styles.aiError}>{aiQueryError}</Text> : null}
                  <PrimaryButton title="Buscar con IA" onPress={() => searchWithAi()} loading={results.status === 'loading'} />
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.inner}>
          {/* Overlaps the bottom of the header. */}
          <View style={styles.quickActions}>
            <QuickActions unreadNotifications={unread} />
          </View>

          {mode === 'browse' ? (
            <>
              {categories && categories.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                  <Chip label="Todas" selected={!categoryId} onPress={() => setCategoryId(null)} />
                  {categories.map((category) => (
                    <Chip
                      key={category.id}
                      label={category.name}
                      selected={categoryId === category.id}
                      onPress={() => setCategoryId(categoryId === category.id ? null : category.id)}
                    />
                  ))}
                </ScrollView>
              )}

              {filtersOpen && (
                <View style={styles.filtersPanel}>
                  <FilterGroup label="Provincia">
                    {PROVINCES.map((name) => (
                      <Chip key={name} label={name} selected={province === name} onPress={() => setProvince(province === name ? null : name)} />
                    ))}
                  </FilterGroup>
                  <View style={[styles.panelField, styles.panelFieldSpaced]}>
                    <FilterLabel>Ciudad</FilterLabel>
                    <TextInput
                      value={city}
                      onChangeText={setCity}
                      placeholder="Ej.: Heredia"
                      placeholderTextColor={color.placeholder}
                      accessibilityLabel="Ciudad"
                      style={styles.cityInput}
                    />
                  </View>
                  <View style={styles.panelField}>
                    <FilterLabel>Distancia</FilterLabel>
                    <NearbyToggle
                      location={location}
                      radiusKm={radiusKm}
                      onRadiusChange={setRadiusKm}
                      onEnable={enableLocation}
                      onDisable={disableLocation}
                    />
                  </View>
                  {hasAnyFilter && (
                    <Pressable onPress={clearFilters} accessibilityRole="button" style={styles.clearFilters}>
                      <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={styles.aiExtras}>
              <NearbyToggle
                location={location}
                radiusKm={radiusKm}
                onRadiusChange={setRadiusKm}
                onEnable={enableLocation}
                onDisable={disableLocation}
              />
              {results.status === 'idle' && (
                <FilterGroup label="Probá con">
                  {AI_EXAMPLES.map((example) => (
                    <Chip
                      key={example}
                      label={example}
                      onPress={() => {
                        setAiQuery(example);
                        searchWithAi(example);
                      }}
                    />
                  ))}
                </FilterGroup>
              )}
            </View>
          )}

          <ResultsSection
            mode={mode}
            results={results}
            columns={columns}
            filtered={hasAnyFilter}
            onLoadMore={loadMore}
            onRetry={retry}
            onClearFilters={clearFilters}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModeTab({ label, icon, active, onPress }: { label: string; icon?: ReactNode; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      role="tab"
      aria-selected={active}
      style={[styles.modeTab, active && styles.modeTabActive]}
    >
      {icon}
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

interface ResultsSectionProps {
  mode: Mode;
  results: SearchResults;
  columns: number;
  filtered: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onClearFilters: () => void;
}

function ResultsSection({ mode, results, columns, filtered, onLoadMore, onRetry, onClearFilters }: ResultsSectionProps) {
  if (results.status === 'idle') return null;

  const title = mode === 'ai' ? 'Resultados' : filtered ? 'Resultados' : 'Negocios para vos';

  return (
    <View style={styles.results}>
      {results.status === 'ready' && results.criteria && <CriteriaSummary criteria={results.criteria} />}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} role="heading" aria-level={2}>
          {title}
        </Text>
        {results.status === 'ready' && results.pagination.total > 0 && (
          <Text style={styles.sectionCount}>
            {results.pagination.total} {results.pagination.total === 1 ? 'negocio' : 'negocios'}
          </Text>
        )}
      </View>

      {results.status === 'loading' && <SkeletonGrid columns={columns} />}

      {results.status === 'error' && results.message !== '' && (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Algo salió mal</Text>
          <Text style={styles.stateText}>{results.message}</Text>
          <Pressable onPress={onRetry} accessibilityRole="button" style={styles.stateButton}>
            <Text style={styles.stateButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {results.status === 'ready' && results.pagination.total === 0 && (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>No encontramos negocios</Text>
          <Text style={styles.stateText}>
            {mode === 'ai'
              ? 'Probá describiendo el servicio con otras palabras o activá "Cerca de mí".'
              : filtered
                ? 'Probá con otro nombre o quitá algunos filtros.'
                : 'Todavía no hay negocios activos para mostrar.'}
          </Text>
          {mode === 'browse' && filtered && (
            <Pressable onPress={onClearFilters} accessibilityRole="button" style={styles.stateButton}>
              <Text style={styles.stateButtonText}>Limpiar filtros</Text>
            </Pressable>
          )}
        </View>
      )}

      {results.status === 'ready' && results.businesses.length > 0 && (
        <>
          <Grid columns={columns} businesses={results.businesses} />
          {results.pagination.page < results.pagination.totalPages && (
            <View style={styles.loadMore}>
              <PrimaryButton title="Cargar más" onPress={onLoadMore} loading={results.loadingMore} />
            </View>
          )}
          {results.loadMoreError && <Text style={styles.error}>{results.loadMoreError}</Text>}
        </>
      )}
    </View>
  );
}

/** Rows of `columns` cards; the last row is padded so its cards keep the same width. */
function Grid({ columns, businesses }: { columns: number; businesses: Business[] }) {
  const rows: Business[][] = [];
  for (let i = 0; i < businesses.length; i += columns) rows.push(businesses.slice(i, i + columns));
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0].id} style={styles.gridRow}>
          {row.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad-${i}`} style={styles.gridPad} />
          ))}
        </View>
      ))}
    </View>
  );
}

function SkeletonGrid({ columns }: { columns: number }) {
  return (
    <View style={styles.gridRow} accessibilityLabel="Cargando negocios" accessibilityRole="progressbar">
      {Array.from({ length: columns }, (_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonBanner} />
          <View style={styles.skeletonBody}>
            <View style={[styles.skeletonLine, { width: '60%' }]} />
            <View style={[styles.skeletonLine, { width: '90%' }]} />
            <View style={[styles.skeletonLine, { width: '40%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.background,
  },
  scroll: {
    paddingBottom: 40,
  },
  inner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  hero: {
    backgroundColor: color.panelDark,
    paddingBottom: 56,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginBottom: 24,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoutActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: color.onPanelDark,
  },
  greeting: {
    fontSize: 30,
    fontWeight: '800',
    color: color.onPanelDark,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    color: color.onPanelDarkMuted,
    marginBottom: 20,
  },
  modeSwitch: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    padding: 4,
    marginBottom: 14,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  modeTabActive: {
    backgroundColor: color.onPanelDark,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.onPanelDarkMuted,
  },
  modeTabTextActive: {
    color: color.panelDark,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: color.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 52,
    borderWidth: 2,
    borderColor: color.surface,
  },
  // The whole box shows focus instead of the browser's outline around the bare input.
  searchBoxFocused: {
    borderColor: color.accentAmber,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: color.textPrimary,
    paddingVertical: 12,
  },
  clearText: {
    fontSize: 16,
    color: color.textSecondary,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  filterButtonOpen: {
    backgroundColor: color.onPanelDark,
    borderColor: color.onPanelDark,
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: color.accentAmber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: color.panelDark,
  },
  aiBox: {
    backgroundColor: color.surface,
    borderRadius: 18,
    padding: 12,
  },
  aiInput: {
    minHeight: 72,
    fontSize: 16,
    color: color.textPrimary,
    textAlignVertical: 'top',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  aiError: {
    fontSize: 13,
    color: color.danger,
    paddingHorizontal: 4,
  },
  quickActions: {
    marginTop: -36,
    marginBottom: 20,
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 12,
  },
  filtersPanel: {
    backgroundColor: color.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.border,
    padding: 16,
    marginBottom: 12,
  },
  panelField: {
    gap: 8,
  },
  panelFieldSpaced: {
    marginBottom: 16,
  },
  cityInput: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: color.textPrimary,
    backgroundColor: color.surface,
  },
  clearFilters: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.accentTeal,
  },
  aiExtras: {
    marginBottom: 4,
  },
  results: {
    marginTop: 8,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: color.textPrimary,
  },
  sectionCount: {
    fontSize: 14,
    color: color.textSecondary,
  },
  grid: {
    gap: 14,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 14,
  },
  gridPad: {
    flex: 1,
  },
  loadMore: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
  },
  error: {
    fontSize: 14,
    color: color.danger,
    textAlign: 'center',
  },
  stateBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: color.textPrimary,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    color: color.textSecondary,
    textAlign: 'center',
  },
  stateButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: color.accentTeal,
  },
  stateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.onPanelDark,
  },
  skeletonCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  skeletonBanner: {
    height: 84,
    backgroundColor: color.surfaceMuted,
  },
  skeletonBody: {
    padding: 16,
    gap: 10,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: color.surfaceMuted,
  },
});
