import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@spot/shared';
import { font } from '@/theme/fonts';

const TOAST_MS = 4000;

const ToastContext = createContext<(message: string) => void>(() => {});

/** Shows a success message for a few seconds. Errors stay on screen instead (ErrorMessage). */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <SafeAreaView edges={['bottom']} style={styles.region}>
        {/* Always mounted, only its content changes: a live region has to exist before its content does. */}
        <View role="status" accessibilityLiveRegion="polite">
          {message && (
            <View style={styles.toast}>
              <Text style={styles.text}>{message}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  region: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 16,
    alignItems: 'center',
    // The toast never blocks the buttons under it.
    pointerEvents: 'none',
  },
  toast: {
    maxWidth: 360,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderLeftWidth: 4,
    borderLeftColor: color.success,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    boxShadow: '0 8px 24px rgba(15, 36, 56, 0.12)',
  },
  text: {
    fontSize: 14,
    fontFamily: font.semibold,
    color: color.textPrimary,
  },
});
