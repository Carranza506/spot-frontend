import { StyleSheet, Text, View } from 'react-native';
import { DAY_LABELS, WEEK_ORDER, color, fromApiTime, listBusinessHours } from '@spot/shared';
import { authClient } from '@/api/client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { weekSchedule } from './businessInfo';
import { Section } from './Section';
import { font } from '@/theme/fonts';

export function HoursSection({ businessId }: { businessId: string }) {
  const [state] = useAsyncData(() => listBusinessHours(authClient, businessId), [businessId]);
  // The phone's day: the app is used in Costa Rica, where the businesses are.
  const today = new Date().getDay();

  return (
    <Section
      title="Horario"
      state={state}
      errorMessage="No se pudo cargar el horario."
      emptyMessage="Este negocio todavía no publicó su horario."
      isEmpty={(page) => page.data.length === 0}
    >
      {(page) => (
        <View style={styles.card}>
          {weekSchedule(page.data, WEEK_ORDER).map((day) => {
            const isToday = day.dayOfWeek === today;
            const hours = day.openTime && day.closeTime
              ? `${fromApiTime(day.openTime)} – ${fromApiTime(day.closeTime)}`
              : 'Cerrado';
            return (
              <View key={day.dayOfWeek} style={[styles.row, isToday && styles.today]}>
                <Text style={[styles.day, isToday && styles.todayText]}>
                  {DAY_LABELS[day.dayOfWeek]}
                  {isToday ? ' (hoy)' : ''}
                </Text>
                <Text style={[styles.hours, !day.openTime && styles.closed, isToday && styles.todayText]}>{hours}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  today: {
    backgroundColor: color.surfaceMuted,
  },
  day: {
    fontSize: 15,
    fontFamily: font.regular,
    color: color.textPrimary,
  },
  hours: {
    fontSize: 15,
    fontFamily: font.semibold,
    color: color.textPrimary,
  },
  closed: {
    fontFamily: font.regular,
    color: color.textSecondary,
  },
  todayText: {
    fontFamily: font.bold,
    color: color.accentTeal,
  },
});
