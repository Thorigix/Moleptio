import '@/polyfills';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { SplashGate } from '@/components/splash-gate';
import { useTheme, useThemeSystemListener } from '@/services/theme';
import { initDeepLinkListener } from '@/services/wallet';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    const cleanup = initDeepLinkListener();
    return cleanup;
  }, []);

  return (
    <SplashGate>
      <ThemedRoot />
    </SplashGate>
  );
}

function ThemedRoot() {
  useThemeSystemListener();
  const { resolvedMode, colors } = useTheme();
  const navTheme = resolvedMode === 'dark' ? DarkTheme : DefaultTheme;
  const navThemeWithBg = {
    ...navTheme,
    colors: { ...navTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, primary: colors.accent },
  };

  return (
    <ThemeProvider value={navThemeWithBg}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.bg },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="phantom/connect" options={{ headerShown: false }} />
          <Stack.Screen name="phantom/sign" options={{ headerShown: false }} />
          <Stack.Screen name="campaign/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="campaign/create"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen name="how-it-works" options={{ headerShown: false }} />
          <Stack.Screen name="bridge/index" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      </View>
    </ThemeProvider>
  );
}
