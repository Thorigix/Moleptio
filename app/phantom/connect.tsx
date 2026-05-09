import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ThemeColors, useTheme } from '@/services/theme';
import { handlePhantomConnectCallbackParams } from '@/services/wallet';
import { useWalletStore } from '@/services/wallet/store';

export default function PhantomConnectCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phantom_encryption_public_key?: string;
    nonce?: string;
    data?: string;
    errorCode?: string;
    errorMessage?: string;
  }>();

  const session = useWalletStore((s) => s.session);
  const setConnecting = useWalletStore((s) => s.setConnecting);
  const [timedOut, setTimedOut] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Log the callback payload once on mount.
  useEffect(() => {
    console.log('[Phantom callback /phantom/connect]', {
      phantom_encryption_public_key: params.phantom_encryption_public_key,
      nonce: params.nonce,
      data: params.data,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
    });
  }, []);

  // Fallback: Expo Router may consume the initial URL before Linking listeners
  // see it. In that case, process the query params directly to finalize the
  // Phantom session.
  useEffect(() => {
    if (session) return;
    if (params.errorCode) return;
    const missing =
      !params.phantom_encryption_public_key || !params.nonce || !params.data;
    if (missing) {
      // If we landed here without Phantom's required payload, don't wait for a timeout.
      setLocalError('Phantom callback is missing required parameters (nonce/data/public key).');
      setConnecting(false);
      return;
    }

    handlePhantomConnectCallbackParams(params as any).catch((e) => {
      console.warn('[Phantom] connect param handler failed:', e);
      setLocalError(e?.message ?? 'Failed to finalize Phantom session.');
      setConnecting(false);
    });
  }, [params, session, setConnecting]);

  // The deeplink listener registered in app/_layout.tsx decrypts the payload
  // and writes the session to the store. We just wait for that to land, then
  // bounce back to home. 8s safety timeout in case something goes wrong.
  //
  // The setTimeout(0) is intentional: Phantom sometimes redirects back before
  // Expo Router's Root Layout has finished mounting its navigator. Deferring
  // one tick guarantees the navigator exists before we call replace().
  useEffect(() => {
    if (session) {
      const t = setTimeout(() => router.replace('/(tabs)'), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTimedOut(true), 12000);
    return () => clearTimeout(t);
  }, [session, router]);

  const errored = !!params.errorCode || timedOut || !!localError;

  return (
    <View style={styles.container}>
      {errored ? (
        <>
          <Text style={styles.title}>Connection failed</Text>
          <Text style={styles.subtitle}>
            {params.errorMessage ?? localError ?? 'Phantom did not return a valid session. Try again.'}
          </Text>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.title}>Connecting wallet…</Text>
          <Text style={styles.subtitle}>Finalizing your Phantom session.</Text>
        </>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 12,
    },
    title: { color: c.text, fontSize: 18, fontWeight: '600', marginTop: 8 },
    subtitle: { color: c.textSubtle, fontSize: 14, textAlign: 'center' },
  });
