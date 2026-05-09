import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

import { useTheme } from '@/services/theme';

const LIGHT_THEME_LOGO = require('@/assets/images/MoleptioDark.png');
const DARK_THEME_LOGO = require('@/assets/images/MoleptioLight.png');
const MIN_SPLASH_MS = 1200;

type Props = { children: React.ReactNode };

export function SplashGate({ children }: Props) {
  const { resolvedMode, colors } = useTheme();
  const [hidden, setHidden] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }).start(() => setHidden(true));
    }, MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, [opacity]);

  const source = resolvedMode === 'dark' ? DARK_THEME_LOGO : LIGHT_THEME_LOGO;

  return (
    <View style={styles.root}>
      {children}
      {!hidden && (
        <Animated.View
          style={[styles.cover, { opacity, backgroundColor: colors.bg }]}
          pointerEvents={hidden ? 'none' : 'auto'}>
          <Image source={source} resizeMode="contain" style={styles.logo} />
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
