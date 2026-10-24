import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  AI_SEARCH_QUERY_MAX_LENGTH,
  AI_SEARCH_QUERY_MIN_LENGTH,
  ApiError,
  aiSearchQuery,
  color,
  listCategories,
  searchBusinesses,
  type components,
} from '@spot/shared';
import { authClient } from '@/api/client';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { BusinessResultCard } from '@/search/BusinessResultCard';
import { Chip } from '@/search/Chip';
import { useCurrentLocation, type LocationState } from '@/search/useCurrentLocation';

type Business = components['schemas']['Business'];
type Category = components['schemas']['Category'];
type Pagination = components['schemas']['PaginationMeta'];
type AiSearchCriteria = components['schemas']['AiSearchCriteria'];

type Mode = 'ai' | 'filters';

/** A page of results plus, for the AI mode, the criteria it extracted. */
interface ResultsPage {
  businesses: Business[];
  pagination: Pagination;
  criteria?: AiSearchCriteria;
}

type Results =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; businesses: Business[]; pagination: Pagination; criteria?: AiSearchCriteria; loadingMore: boolean }
  | { status: 'error'; message: string };

const PAGE_SIZE = 20;
const RADIUS_OPTIONS_KM = [5, 10, 25];
const PROVINCES = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];
const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

const dateFormat = new Intl.DateTimeFormat('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });
// Colones, like the web dashboard's formatPrice (not in @spot/shared yet).
const priceFormat = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

/** Buscar: natural language (AI) or traditional filters, both feeding the same results list (#23). */
export default function SearchScreen() {
  const [mode, setMode] = useState<Mode>('ai');
  const [results, setResults] = useState<Results>({ status: 'idle' });
  const { location, enable: enableLocation, disable: disableLocation } = useCurrentLocation();
  const [radiusKm, setRadiusKm] = useState(10);

  // AI mode
  const [aiQuery, setAiQuery] = useState('');
  const [aiQueryError, setAiQueryError] = useState<string | undefined>();

  // Filters mode
  const [text, setText] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);

  // The page fetcher of the search on screen, so "Cargar más" repeats it with the next page.
  const fetchPageRef = useRef<((page: number) => Promise<ResultsPage>) | null>(null);
  // Bumped per search, so a slow response to an older search can't overwrite a newer one.
  const searchId = useRef(0);

  useEffect(() => {
    // Root categories only: they're the broad ones a user filters by.
    listCategories(authClient)
      .then((page) => setCategories(page.data.filter((c) => c.isActive && !c.parentCategoryId)))
      .catch(() => setCategories([]));
  }, []);

  const coords = location.status === 'on' ? location.coords : null;

  function handleError(error: unknown): string {
    if (error instanceof ApiError && error.status === 401) {
      router.replace('/');
      return '';
    }
    if (error instanceof ApiError && error.status === 422) {
      return 'No pudimos entender la búsqueda. Probá describirla con otras palabras.';
    }
    // The gateway/service is down or the endpoint isn't deployed: its message isn't for end users.
    if (error instanceof ApiError && (error.status === 404 || error.status >= 500)) {
      return mode === 'ai'
        ? 'La búsqueda con IA no está disponible en este momento. Probá con Filtros.'
        : 'La búsqueda no está disponible en este momento. Intentá de nuevo más tarde.';
    }
    return error instanceof ApiError ? error.message : NETWORK_ERROR;
  }

  async function runSearch(fetchPage: (page: number) => Promise<ResultsPage>) {
    const id = ++searchId.current;
    fetchPageRef.current = fetchPage;
    setResults({ status: 'loading' });
    try {
      const page = await fetchPage(1);
      if (id !== searchId.current) return;
      setResults({ status: 'ready', ...page, loadingMore: false });
    } catch (error) {
      if (id === searchId.current) setResults({ status: 'error', message: handleError(error) });
    }
  }

  async function loadMore() {
    if (results.status !== 'ready' || results.loadingMore || !fetchPageRef.current) return;
    const id = searchId.current;
    const nextPage = results.pagination.page + 1;
    setResults({ ...results, loadingMore: true });
    try {
      const page = await fetchPageRef.current(nextPage);
      if (id !== searchId.current) return;
      setResults((current) =>
        current.status === 'ready'
          ? { ...current, businesses: [...current.businesses, ...page.businesses], pagination: page.pagination, loadingMore: false }
          : current,
      );
    } catch (error) {
      if (id === searchId.current) setResults({ status: 'error', message: handleError(error) });
    }
  }

  function searchWithAi() {
    const query = aiQuery.trim();
    if (query.length < AI_SEARCH_QUERY_MIN_LENGTH) {
      setAiQueryError(`Escribí al menos ${AI_SEARCH_QUERY_MIN_LENGTH} caracteres.`);
      return;
    }
    setAiQueryError(undefined);
    // radiusKm only matters with a location; without one the backend ignores it (the contract defaults it to 10).
    const location = coords ?? undefined;
    void runSearch(async (page) => {
      const result = await aiSearchQuery(authClient, { query, location, radiusKm, page, pageSize: PAGE_SIZE });
      return { businesses: result.businesses.data, pagination: result.businesses.pagination, criteria: result.criteria };
    });
  }

  function searchWithFilters() {
    const filter = {
      q: text,
      city,
      province: province ?? undefined,
      categoryId: categoryId ?? undefined,
      ...(coords ? { lat: coords.latitude, lng: coords.longitude, radiusKm } : {}),
    };
    void runSearch(async (page) => {
      const result = await searchBusinesses(authClient, { ...filter, page, pageSize: PAGE_SIZE });
      return { businesses: result.data, pagination: result.pagination };
    });
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    // The list is shared, but it shows the results of the mode on screen.
    searchId.current++;
    setResults({ status: 'idle' });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} hitSlop={8}>
          <Text style={styles.back}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title}>Buscar</Text>

        <View style={styles.segmented}>
          <SegmentButton label="Describí lo que buscás" active={mode === 'ai'} onPress={() => switchMode('ai')} />
          <SegmentButton label="Filtros" active={mode === 'filters'} onPress={() => switchMode('filters')} />
        </View>

        {mode === 'ai' ? (
          <View>
            <TextField
              label="¿Qué necesitás?"
              placeholder="Ej.: un corte de cabello mañana en la tarde, hasta 15 mil colones"
              multiline
              numberOfLines={3}
              maxLength={AI_SEARCH_QUERY_MAX_LENGTH}
              value={aiQuery}
              onChangeText={setAiQuery}
              error={aiQueryError}
              style={styles.multiline}
            />
            <NearbyToggle
              location={location}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              onEnable={enableLocation}
              onDisable={disableLocation}
            />
            <PrimaryButton title="Buscar" onPress={searchWithAi} loading={results.status === 'loading'} />
          </View>
        ) : (
          <View>
            <TextField label="Nombre o servicio" placeholder="Ej.: barbería" value={text} onChangeText={setText} />
            {categories && categories.length > 0 && (
              <FilterGroup label="Categoría">
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    selected={categoryId === category.id}
                    onPress={() => setCategoryId(categoryId === category.id ? null : category.id)}
                  />
                ))}
              </FilterGroup>
            )}
            <FilterGroup label="Provincia">
              {PROVINCES.map((name) => (
                <Chip key={name} label={name} selected={province === name} onPress={() => setProvince(province === name ? null : name)} />
              ))}
            </FilterGroup>
            <TextField label="Ciudad" placeholder="Ej.: Heredia" value={city} onChangeText={setCity} />
            <NearbyToggle
              location={location}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              onEnable={enableLocation}
              onDisable={disableLocation}
            />
            <PrimaryButton title="Buscar" onPress={searchWithFilters} loading={results.status === 'loading'} />
          </View>
        )}

        <View style={styles.results}>
          {results.status === 'loading' && <ActivityIndicator color={color.accentTeal} />}
          {results.status === 'error' && results.message !== '' && <Text style={styles.error}>{results.message}</Text>}
          {results.status === 'ready' && (
            <>
              {results.criteria && <CriteriaSummary criteria={results.criteria} />}
              <Text style={styles.count}>
                {results.pagination.total === 0
                  ? 'No encontramos negocios con esa búsqueda.'
                  : `${results.pagination.total} ${results.pagination.total === 1 ? 'negocio encontrado' : 'negocios encontrados'}`}
              </Text>
              {results.businesses.map((business) => (
                <BusinessResultCard key={business.id} business={business} />
              ))}
              {results.pagination.page < results.pagination.totalPages && (
                <PrimaryButton title="Cargar más" onPress={loadMore} loading={results.loadingMore} />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.segment, active && styles.segmentActive]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

interface NearbyToggleProps {
  location: LocationState;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  onEnable: () => void;
  onDisable: () => void;
}

/** "Cerca de mí": asks for the location on first use, then lets the user pick the radius. */
function NearbyToggle({ location, radiusKm, onRadiusChange, onEnable, onDisable }: NearbyToggleProps) {
  const on = location.status === 'on';
  return (
    <View style={styles.filterGroup}>
      <View style={styles.chips}>
        <Chip
          label={location.status === 'locating' ? 'Buscando tu ubicación…' : on ? 'Cerca de mí ✓' : 'Cerca de mí'}
          selected={on}
          disabled={location.status === 'locating'}
          onPress={on ? onDisable : onEnable}
        />
        {on &&
          RADIUS_OPTIONS_KM.map((km) => (
            <Chip key={km} label={`${km} km`} selected={radiusKm === km} onPress={() => onRadiusChange(km)} />
          ))}
      </View>
      {location.status === 'denied' && (
        <Text style={styles.hint}>Sin permiso de ubicación: buscamos sin filtrar por cercanía.</Text>
      )}
      {location.status === 'error' && <Text style={styles.hint}>No pudimos obtener tu ubicación. Intentá de nuevo.</Text>}
    </View>
  );
}

/** What the AI understood from the query, so the user can tell why these results came back. */
function CriteriaSummary({ criteria }: { criteria: AiSearchCriteria }) {
  const items = [
    criteria.serviceQuery,
    criteria.date ? dateFormat.format(new Date(`${criteria.date}T12:00:00`)) : null,
    criteria.time ? criteria.time.slice(0, 5) : null,
    criteria.budgetMaxColones != null ? `Hasta ${priceFormat.format(criteria.budgetMaxColones)}` : null,
    criteria.rawLocationText,
  ].filter((item): item is string => !!item);

  if (items.length === 0) return null;
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>Entendimos</Text>
      <View style={styles.chips}>
        {items.map((item) => (
          <Chip key={item} label={item} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
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
    marginBottom: 16,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: color.surfaceMuted,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: color.surface,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: color.textSecondary,
  },
  segmentTextActive: {
    color: color.textPrimary,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  filterGroup: {
    marginBottom: 18,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: color.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hint: {
    fontSize: 13,
    color: color.textSecondary,
  },
  results: {
    marginTop: 24,
    gap: 12,
  },
  count: {
    fontSize: 14,
    color: color.textSecondary,
  },
  error: {
    fontSize: 14,
    color: color.danger,
  },
});
