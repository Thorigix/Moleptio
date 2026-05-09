import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors, useTheme } from '@/services/theme';

type Props = {
  visible: boolean;
  message: string | null;
  onRetry?: () => void;
  onDismiss: () => void;
};

export function TxErrorToast({ visible, message, onRetry, onDismiss }: Props) {
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
        <View style={styles.dot} />
        <View style={styles.body}>
          <Text style={styles.title}>Transaction failed</Text>
          {message && (
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          )}
        </View>
        {onRetry && (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}>
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.bgCard,
      borderColor: c.error,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.error },
    body: { flex: 1, gap: 2 },
    title: { color: c.text, fontSize: 14, fontWeight: '600' },
    message: { color: c.textSubtle, fontSize: 12, lineHeight: 16 },
    retry: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: c.errorSoft,
    },
    retryText: { color: c.error, fontSize: 13, fontWeight: '600' },
    dismiss: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    dismissText: { color: c.textSubtle, fontSize: 14 },
    pressed: { opacity: 0.7 },
  });
