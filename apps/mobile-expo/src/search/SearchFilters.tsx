import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, type components } from '@spot/shared';
import { Chip } from './Chip';
import type { LocationState } from './useCurrentLocation';

type AiSearchCriteria = components['schemas']['AiSearchCriteria'];

export const RADIUS_OPTIONS_KM = [5, 10, 25];
export const PROVINCES = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];

const dateFormat = new Intl.DateTimeFormat('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });
// Colones, like the web dashboard's formatPrice (not in @spot/shared yet).
const priceFormat = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
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
export function NearbyToggle({ location, radiusKm, onRadiusChange, onEnable, onDisable }: NearbyToggleProps) {
  const on = location.status === 'on';
  return (
    <View style={styles.group}>
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
export function CriteriaSummary({ criteria }: { criteria: AiSearchCriteria }) {
  const items = [
    criteria.serviceQuery,
    criteria.date ? dateFormat.format(new Date(`${criteria.date}T12:00:00`)) : null,
    criteria.time ? criteria.time.slice(0, 5) : null,
    criteria.budgetMaxColones != null ? `Hasta ${priceFormat.format(criteria.budgetMaxColones)}` : null,
    criteria.rawLocationText,
  ].filter((item): item is string => !!item);

  if (items.length === 0) return null;
  return (
    <FilterGroup label="Entendimos">
      {items.map((item) => (
        <Chip key={item} label={item} />
      ))}
    </FilterGroup>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
});
