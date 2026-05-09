import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors, useTheme } from '@/services/theme';

type Props = {
  visible: boolean;
  message: string | null;
  onRetry?: () => void;
  onDismiss: () => void;
  onGoHome?: () => void;
};

export function TxErrorToast({ visible, message, onRetry, onDismiss, onGoHome }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : 120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateY, opacity]);

  if (!visible && !message) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.wrap, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.toast}>
        <View style={styles.headerRow}>
          <View style={styles.dot} />
          <View style={styles.body}>
            <Text style={styles.title}>Transaction failed</Text>
            {message && (
              <Text style={styles.message} numberOfLines={3}>
                {message}
              </Text>
            )}
          </View>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}>
            <Text style={styles.dismissText}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.actions}>
          {onGoHome && (
            <Pressable
              onPress={onGoHome}
              style={({ pressed }) => [styles.homeBtn, pressed && styles.pressed]}>
              <Text style={styles.homeText}>Back to home</Text>
            </Pressable>
          )}
          {onRetry && (
            <Pressable
              onPress={onRetry}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 100,
    },
    toast: {
      gap: 12,
      backgroundColor: c.bgCard,
      borderColor: c.error,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
    },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.error, marginTop: 6 },
    body: { flex: 1, gap: 4 },
    title: { color: c.text, fontSize: 15, fontWeight: '600' },
    message: { color: c.textSubtle, fontSize: 12, lineHeight: 17 },
    actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
    homeBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    homeText: { color: c.text, fontSize: 13, fontWeight: '600' },
    retry: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: c.errorSoft,
    },
    retryText: { color: c.error, fontSize: 13, fontWeight: '600' },
    dismiss: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    dismissText: { color: c.textSubtle, fontSize: 14 },
    pressed: { opacity: 0.7 },
  });
