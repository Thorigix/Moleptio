import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

import { useCampaignsHydrated } from '@/services/campaigns/store';
import { useTheme } from '@/services/theme';

const LOGO = require('@/assets/images/MoleptioColored.png');
const MIN_SPLASH_MS = 1200;

type Props = { children: React.ReactNode };

export function SplashGate({ children }: Props) {
  const { colors } = useTheme();
  const hydrated = useCampaignsHydrated();
  const [minElapsed, setMinElapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const dismissedRef = useRef(false);

  // Hand off from native splash to in-app overlay immediately on mount.
  // The in-app cover is already visible, so the user sees no gap.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Dismiss when BOTH the minimum splash duration has passed AND the
  // persisted campaign store has rehydrated. This is the fix for the
  // "joined → not joined → joined" flicker: children render against a
  // store that already has joinedIds restored.
  useEffect(() => {
    if (dismissedRef.current) return;
    if (!minElapsed || !hydrated) return;
    dismissedRef.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 320,
      useNativeDriver: true,
    }).start(() => setHidden(true));
  }, [minElapsed, hydrated, opacity]);

  return (
    <View style={styles.root}>
      {children}
      {!hidden && (
        <Animated.View
          style={[styles.cover, { opacity, backgroundColor: colors.bg }]}
          pointerEvents={hidden ? 'none' : 'auto'}>
          <Image source={LOGO} resizeMode="contain" style={styles.logo} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 220, height: 220 },
});
