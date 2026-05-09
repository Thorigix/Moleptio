import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ThemeColors, useTheme } from '@/services/theme';
import { handlePhantomSignCallbackParams } from '@/services/wallet';
import { useWalletStore } from '@/services/wallet/store';

export default function PhantomSignCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    nonce?: string;
    data?: string;
    errorCode?: string;
    errorMessage?: string;
  }>();

  const lastSignature = useWalletStore((s) => s.lastSignature);
  const signing = useWalletStore((s) => s.signing);
  const [timedOut, setTimedOut] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    console.log('[Phantom callback /phantom/sign]', {
      nonce: params.nonce,
      data: params.data,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
    });
  }, []);

  // Fallback: Expo Router may consume the initial URL before Linking listeners
  // see it. Process the query params directly; wallet handler is guarded.
  useEffect(() => {
    if (params.errorCode) return;
    if (lastSignature && !signing) return;
    handlePhantomSignCallbackParams(params as any).catch((e) => {
      console.warn('[Phantom] sign param handler failed:', e);
    });
  }, [params, lastSignature, signing]);

  useEffect(() => {
    // Pop back to whichever screen initiated the sign (campaign detail, home,
    // etc.) so its in-flight state machine — including the success modal —
    // is what the user sees, instead of being dumped on the tabs root.
    if (lastSignature && !signing) {
      const t = setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [lastSignature, signing, router]);

  const errored = !!params.errorCode || timedOut;

  return (
    <View style={styles.container}>
      {errored ? (
        <>
          <Text style={styles.title}>Transaction failed</Text>
          <Text style={styles.subtitle}>
            {params.errorMessage ?? 'Phantom did not return a valid signature.'}
          </Text>
        </>
      ) : lastSignature ? (
        <>
          <Text style={styles.title}>✓ Signed</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {lastSignature.slice(0, 12)}…{lastSignature.slice(-8)}
          </Text>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.title}>Confirming transaction…</Text>
          <Text style={styles.subtitle}>Waiting for Phantom signature.</Text>
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
