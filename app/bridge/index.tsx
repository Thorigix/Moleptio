import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWallet } from '@/hooks/useWallet';
import { useBridgeStore } from '@/services/bridge/store';
import {
  ChainOption,
  LifiRoute,
  SOURCE_CHAINS,
  executeRoute,
  getRoutes,
} from '@/services/lifi';
import { ThemeColors, useTheme } from '@/services/theme';

type Phase = 'idle' | 'quoting' | 'quoted' | 'executing' | 'done' | 'error';

export default function BridgeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { publicKey } = useWallet();
  const recordReceipt = useBridgeStore((s) => s.recordReceipt);

  const [fromChain, setFromChain] = useState<ChainOption>(SOURCE_CHAINS[0]);
  const [amount, setAmount] = useState('25');
  const [routes, setRoutes] = useState<LifiRoute[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount);
  const validAmount = Number.isFinite(amountNum) && amountNum > 0;

  async function handleQuote() {
    if (!validAmount) return;
    setPhase('quoting');
    setError(null);
    setRoutes([]);
    setSelectedId(null);
    try {
      const r = await getRoutes({
        fromChain,
        toAmountUsdc: amountNum,
        toAddress: publicKey ?? undefined,
      });
      if (r.length === 0) {
        setPhase('error');
        setError('No routes available for this amount. Try a different chain or larger amount.');
        return;
      }
      setRoutes(r);
      setSelectedId(r[0].id);
      setPhase('quoted');
    } catch (e: any) {
      setPhase('error');
      setError(e?.message ?? 'Failed to fetch LI.FI routes.');
    }
  }

  async function handleExecute() {
    const route = routes.find((r) => r.id === selectedId);
    if (!route) return;
    setPhase('executing');
    setError(null);
    try {
      const receipt = await executeRoute(route, fromChain);
      recordReceipt(receipt);
      setPhase('done');
    } catch (e: any) {
      setPhase('error');
      setError(e?.message ?? 'Execution failed.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={12}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
              <Text style={styles.backText}>‹  Back</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Fund wallet</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.intro}>
            <Text style={styles.kicker}>Cross-chain · Powered by LI.FI</Text>
            <Text style={styles.title}>Bridge USDC{'\n'}into Solana.</Text>
            <Text style={styles.lede}>
              Pick a source chain, enter an amount, and route through LI.FI to land USDC in your
              Solana wallet. Bridging is for funding only — campaign joins keep using your existing
              Solana flow.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>From chain</Text>
            <View style={styles.chainRow}>
              {SOURCE_CHAINS.map((c) => {
                const active = c.key === fromChain.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => {
                      setFromChain(c);
                      setRoutes([]);
                      setSelectedId(null);
                      setPhase('idle');
                    }}
                    style={({ pressed }) => [
                      styles.chainChip,
                      active && styles.chainChipActive,
                      pressed && styles.pressed,
                    ]}>
                    <Text
                      style={[styles.chainChipText, active && styles.chainChipTextActive]}>
                      {c.short}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Amount (USDC)</Text>
            <View style={styles.amountRow}>
              <TextInput
                value={amount}
                onChangeText={(v) => {
                  setAmount(v.replace(/[^0-9.]/g, ''));
                  setRoutes([]);
                  setSelectedId(null);
                  setPhase('idle');
                }}
                keyboardType="decimal-pad"
                placeholder="25"
                placeholderTextColor={colors.textSubtle}
                style={styles.amountInput}
              />
              <Text style={styles.amountUnit}>USDC</Text>
            </View>
            <Text style={styles.toLine}>
              → Solana · USDC · {publicKey ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}` : 'connect wallet to receive'}
            </Text>
          </View>

          <Pressable
            onPress={handleQuote}
            disabled={!validAmount || phase === 'quoting' || phase === 'executing'}
            style={({ pressed }) => [
              styles.primaryBtn,
              (!validAmount || phase === 'quoting' || phase === 'executing') && styles.primaryBtnDisabled,
              pressed && styles.pressed,
            ]}>
            {phase === 'quoting' ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {routes.length > 0 ? 'Refresh routes' : 'Find routes'}
              </Text>
            )}
          </Pressable>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {routes.length > 0 && (
            <View style={styles.routesWrap}>
              <Text style={styles.sectionTitle}>Routes</Text>
              {routes.map((r, idx) => {
                const active = r.id === selectedId;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setSelectedId(r.id)}
                    style={({ pressed }) => [
                      styles.routeCard,
                      active && styles.routeCardActive,
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.routeHead}>
                      <Text style={styles.routeRank}>
                        {idx === 0 ? 'Recommended' : `Option ${idx + 1}`}
                      </Text>
                      {active && <View style={styles.activeDot} />}
                    </View>
                    <Text style={styles.routeOut}>
                      ≈ {r.toAmountFormatted} USDC on Solana
                    </Text>
                    <View style={styles.routeMetaRow}>
                      <Meta colors={colors} k="ETA" v={`~${Math.max(1, Math.round(r.durationSec / 60))} min`} />
                      <Meta colors={colors} k="Gas" v={r.gasCostUSD ? `$${Number(r.gasCostUSD).toFixed(2)}` : '—'} />
                      <Meta colors={colors} k="Hops" v={String(r.steps.length)} />
                    </View>
                    <Text style={styles.routeTools} numberOfLines={1}>
                      via {r.toolNames.join(' · ') || 'LI.FI'}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={handleExecute}
                disabled={!selectedId || phase === 'executing' || phase === 'done'}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (!selectedId || phase === 'executing' || phase === 'done') && styles.primaryBtnDisabled,
                  pressed && styles.pressed,
                  { marginTop: 14 },
                ]}>
                {phase === 'executing' ? (
                  <ActivityIndicator color={colors.ctaText} />
                ) : phase === 'done' ? (
                  <Text style={styles.primaryBtnText}>✓ Funds en route</Text>
                ) : (
                  <Text style={styles.primaryBtnText}>Execute bridge</Text>
                )}
              </Pressable>
            </View>
          )}

          {phase === 'done' && (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>Bridge initiated</Text>
              <Text style={styles.successBody}>
                We fetched a real LI.FI quote. Execution is simulated in this demo (it requires an
                EVM signer); once you fund your Solana wallet, you can join campaigns.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Pressable
                  onPress={() => router.replace('/(tabs)/explore')}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                  <Text style={styles.secondaryBtnText}>Browse campaigns</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setPhase('idle');
                    setRoutes([]);
                    setSelectedId(null);
                  }}
                  style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}>
                  <Text style={styles.ghostBtnText}>Bridge again</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Meta({ colors, k, v }: { colors: ThemeColors; k: string; v: string }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.meta}>
      <Text style={styles.metaK}>{k}</Text>
      <Text style={styles.metaV}>{v}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    scroll: { paddingBottom: 36, gap: 18 },

    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: { paddingVertical: 6, paddingHorizontal: 4, width: 60 },
    backText: { color: c.accentText, fontSize: 15, fontWeight: '600' },
    headerTitle: { color: c.text, fontSize: 16, fontWeight: '700' },

    intro: { paddingHorizontal: 20, gap: 8, marginTop: 4 },
    kicker: {
      color: c.accentText,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    title: {
      color: c.text,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.6,
      lineHeight: 34,
    },
    lede: { color: c.textMuted, fontSize: 14, lineHeight: 21 },

    card: {
      marginHorizontal: 20,
      backgroundColor: c.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
    },
    fieldLabel: {
      color: c.textSubtle,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },

    chainRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chainChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgInset,
    },
    chainChipActive: { backgroundColor: c.accentSoft, borderColor: c.accentSoft },
    chainChipText: { color: c.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
    chainChipTextActive: { color: c.accentText },

    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bgInset,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
    },
    amountInput: {
      flex: 1,
      color: c.text,
      fontSize: 22,
      fontWeight: '700',
      paddingVertical: 12,
    },
    amountUnit: { color: c.textSubtle, fontSize: 13, fontWeight: '600' },
    toLine: { color: c.textSubtle, fontSize: 12, marginTop: 10 },

    primaryBtn: {
      marginHorizontal: 20,
      backgroundColor: c.cta,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    primaryBtnDisabled: { backgroundColor: c.ctaDisabled },
    primaryBtnText: { color: c.ctaText, fontSize: 15, fontWeight: '700' },

    errorBox: {
      marginHorizontal: 20,
      borderRadius: 12,
      backgroundColor: c.errorSoft,
      borderWidth: 1,
      borderColor: c.error,
      padding: 12,
    },
    errorText: { color: c.error, fontSize: 13, lineHeight: 19 },

    routesWrap: { paddingHorizontal: 20, gap: 10 },
    sectionTitle: { color: c.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },

    routeCard: {
      backgroundColor: c.bgCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 8,
    },
    routeCardActive: { borderColor: c.accent },
    routeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    routeRank: {
      color: c.accentText,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
    routeOut: { color: c.text, fontSize: 17, fontWeight: '700' },
    routeMetaRow: { flexDirection: 'row', gap: 18 },
    meta: {},
    metaK: {
      color: c.textSubtle,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    metaV: { color: c.text, fontSize: 13, fontWeight: '600', marginTop: 2 },
    routeTools: { color: c.textSubtle, fontSize: 12 },

    successCard: {
      marginHorizontal: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.success,
      backgroundColor: c.successSoft,
      padding: 16,
    },
    successTitle: { color: c.success, fontSize: 15, fontWeight: '700' },
    successBody: { color: c.textMuted, fontSize: 13, lineHeight: 20, marginTop: 6 },
    secondaryBtn: {
      backgroundColor: c.cta,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    secondaryBtnText: { color: c.ctaText, fontSize: 13, fontWeight: '700' },
    ghostBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    ghostBtnText: { color: c.textMuted, fontSize: 13, fontWeight: '600' },

    pressed: { opacity: 0.85 },
  });
