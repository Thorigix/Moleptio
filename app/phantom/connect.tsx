import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ThemeColors, useTheme } from '@/services/theme';
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
  const [timedOut, setTimedOut] = useState(false);
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

  // The deeplink listener registered in app/_layout.tsx decrypts the payload
  // and writes the session to the store. We just wait for that to land, then
  // bounce back to home. 8s safety timeout in case something goes wrong.
  useEffect(() => {
    if (session) {
      router.replace('/');
      return;
    }
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [session, router]);

  const errored = !!params.errorCode || timedOut;

  return (
    <View style={styles.container}>
      {errored ? (
        <>
          <Text style={styles.title}>Connection failed</Text>
          <Text style={styles.subtitle}>
            {params.errorMessage ?? 'Phantom did not return a valid session. Try again.'}
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
