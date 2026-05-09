import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useWallet } from '@/hooks/useWallet';
import { useCampaignStore } from '@/services/campaigns/store';
import { connection } from '@/services/solana/connection';
import { ThemeColors, useTheme } from '@/services/theme';
import { explorerUrl } from '@/services/tx/state';
import { Campaign } from '@/types/campaign';

function useWalletBalance(publicKey: string | null) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const lamports = await connection.getBalance(new PublicKey(publicKey));
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      } catch (e) {
        console.warn('[balance] fetch failed', e);
        if (!cancelled) setBalance(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  return { balance, loading };
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { connected, connecting, publicKey, connect, disconnect } = useWallet();
  const { balance, loading: balanceLoading } = useWalletBalance(publicKey);

  const refreshStatuses = useCampaignStore((s) => s.refreshStatuses);
  useEffect(() => {
    refreshStatuses();
  }, [refreshStatuses]);

  const campaigns = useCampaignStore((s) => s.campaigns);
  const joinedIds = useCampaignStore((s) => s.joinedIds ?? {});
  const txByCampaign = useCampaignStore((s) => s.txByCampaign);

  const joinedCampaigns = useMemo(
    () => campaigns.filter((c) => joinedIds[c.id] === true),
    [campaigns, joinedIds],
  );

  const totalLocked = useMemo(
    () => joinedCampaigns.reduce((sum, c) => sum + c.price, 0),
    [joinedCampaigns],
  );

  const shortKey = publicKey
    ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`
    : null;

  const onDisconnect = () => {
    Alert.alert(
      'Disconnect wallet?',
      'Your participation history stays on this device — it will reappear when you reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => disconnect(),
        },
      ],
    );
  };

  const onOpenExplorer = (signature: string) => {
    Linking.openURL(explorerUrl(signature)).catch(() => { });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <IconSymbol name="person.fill" size={44} color={colors.accentText} />
          </View>
        </View>

        {connected && publicKey ? (
          <>
            <View style={styles.identityBlock}>
              <Text style={styles.shortKey}>{shortKey}</Text>
              <Text
                style={styles.fullKey}
                selectable
                numberOfLines={1}
                ellipsizeMode="middle">
                {publicKey}
              </Text>
              <Text style={styles.network}>Solana · devnet</Text>
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Balance</Text>
                {balanceLoading && balance === null ? (
                  <ActivityIndicator color={colors.textSubtle} size="small" />
                ) : (
                  <Text style={styles.statValue}>
                    {balance === null ? '—' : `${balance.toFixed(3)} SOL`}
                  </Text>
                )}
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Locked</Text>
                <Text style={styles.statValue}>{totalLocked.toFixed(3)} SOL</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Campaigns</Text>
                <Text style={styles.statValue}>{joinedCampaigns.length}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Participated campaigns</Text>
              {joinedCampaigns.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>
                    You haven&apos;t joined any campaigns yet.
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(tabs)/explore')}
                    style={({ pressed }) => [
                      styles.emptyCta,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.emptyCtaText}>Browse campaigns</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.list}>
                  {joinedCampaigns.map((c) => (
                    <ParticipationRow
                      key={c.id}
                      colors={colors}
                      campaign={c}
                      signature={txByCampaign[c.id]?.signature ?? null}
                      onPress={() =>
                        router.push({
                          pathname: '/campaign/[id]',
                          params: { id: c.id },
                        })
                      }
                      onOpenExplorer={onOpenExplorer}
                    />
                  ))}
                </View>
              )}
            </View>

            <Pressable
              onPress={onDisconnect}
              style={({ pressed }) => [
                styles.disconnectBtn,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.disconnectText}>Disconnect wallet</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.connectBlock}>
            <Text style={styles.connectTitle}>No wallet connected</Text>
            <Text style={styles.connectBody}>
              Connect Phantom to track your participation, locked SOL, and on-chain
              receipts.
            </Text>
            <Pressable
              onPress={connect}
              disabled={connecting}
              style={({ pressed }) => [
                styles.connectBtn,
                pressed && styles.pressed,
                connecting && styles.connectBtnDisabled,
              ]}>
              <Text style={styles.connectBtnText}>
                {connecting ? 'Opening Phantom…' : 'Connect wallet'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ParticipationRow({
  colors,
  campaign,
  signature,
  onPress,
  onOpenExplorer,
}: {
  colors: ThemeColors;
  campaign: Campaign;
  signature: string | null;
  onPress: () => void;
  onOpenExplorer: (sig: string) => void;
}) {
  const styles = makeStyles(colors);
  const shortSig = signature ? `${signature.slice(0, 6)}…${signature.slice(-6)}` : null;
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
        <Image source={campaign.image} style={styles.rowThumb} contentFit="cover" />
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {campaign.title}
          </Text>
          <Text style={styles.rowSub}>
            {campaign.price} SOL ·{' '}
            {campaign.currentParticipants}/{campaign.targetParticipants} joined
          </Text>
        </View>
        <Text style={styles.rowChevron}>›</Text>
      </Pressable>
      {shortSig && (
        <Pressable
          onPress={() => onOpenExplorer(signature!)}
          hitSlop={6}
          style={({ pressed }) => [
            styles.txChip,
            pressed && styles.pressed,
          ]}>
          <View style={styles.txDot} />
          <Text style={styles.txLabel}>tx</Text>
          <Text style={styles.txSig}>{shortSig}</Text>
          <Text style={styles.txArrow}>↗</Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    scroll: { paddingBottom: 40 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backText: { color: c.text, fontSize: 28, marginTop: -4, fontWeight: '400' },
    headerTitle: { color: c.text, fontSize: 17, fontWeight: '600' },

    avatarWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 18 },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },

    identityBlock: { alignItems: 'center', gap: 6, paddingHorizontal: 24 },
    shortKey: {
      color: c.text,
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.4,
    },
    fullKey: {
      color: c.textSubtle,
      fontSize: 12,
      fontFamily: 'Courier',
      maxWidth: '92%',
    },
    network: {
      marginTop: 4,
      color: c.accentText,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },

    statsCard: {
      marginHorizontal: 20,
      marginTop: 24,
      backgroundColor: c.bgCard,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    statCol: { flex: 1, gap: 4, alignItems: 'center' },
    statLabel: {
      color: c.textSubtle,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    statValue: { color: c.text, fontSize: 16, fontWeight: '700' },
    statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: c.border },

    section: { paddingHorizontal: 20, marginTop: 28, gap: 12 },
    sectionTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    list: { gap: 10 },

    row: {
      backgroundColor: c.bgCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    rowMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
    },
    rowThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: c.bgInset },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { color: c.text, fontSize: 14, fontWeight: '600' },
    rowSub: { color: c.textSubtle, fontSize: 12 },
    rowChevron: { color: c.textSubtle, fontSize: 22, fontWeight: '300' },

    txChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bgInset,
    },
    txDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.success },
    txLabel: {
      color: c.textSubtle,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    txSig: {
      color: c.accentText,
      fontSize: 12,
      fontFamily: 'Courier',
      flex: 1,
    },
    txArrow: { color: c.accentText, fontSize: 12, fontWeight: '600' },

    empty: {
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.border,
    },
    emptyText: { color: c.textSubtle, fontSize: 13, textAlign: 'center' },
    emptyCta: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: c.accentSoft,
    },
    emptyCtaText: { color: c.accentText, fontSize: 13, fontWeight: '600' },

    disconnectBtn: {
      marginHorizontal: 20,
      marginTop: 32,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: c.errorSoft,
      borderWidth: 1,
      borderColor: c.errorSoft,
    },
    disconnectText: { color: c.error, fontSize: 14, fontWeight: '600' },

    connectBlock: {
      marginHorizontal: 20,
      marginTop: 24,
      gap: 14,
      alignItems: 'center',
      paddingVertical: 18,
    },
    connectTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
    connectBody: {
      color: c.textMuted,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      paddingHorizontal: 24,
    },
    connectBtn: {
      marginTop: 8,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 14,
      backgroundColor: c.cta,
    },
    connectBtnDisabled: { opacity: 0.6 },
    connectBtnText: { color: c.ctaText, fontSize: 15, fontWeight: '600' },

    pressed: { opacity: 0.85 },
  });
