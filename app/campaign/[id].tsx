import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampaignProgress } from '@/components/campaign-progress';
import { TxErrorToast } from '@/components/tx-error-toast';
import { TxSuccessModal } from '@/components/tx-success-modal';
import { useWallet } from '@/hooks/useWallet';
import { useCampaignStore } from '@/services/campaigns/store';
import { buildSelfTransferTx } from '@/services/solana/transactions';
import { ThemeColors, useTheme } from '@/services/theme';
import { useTxStore } from '@/services/tx/state';
import { Campaign } from '@/types/campaign';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const campaign = useCampaignStore((s) => s.campaigns.find((c) => c.id === id));
  const joined = useCampaignStore((s) => (id ? s.joinedIds.has(id) : false));
  const join = useCampaignStore((s) => s.join);
  const leave = useCampaignStore((s) => s.leave);
  const { connected, publicKey, connect, signAndSendTransaction } = useWallet();
  const txState = useTxStore((s) => s.state);
  const txSignature = useTxStore((s) => s.signature);
  const txError = useTxStore((s) => s.error);
  const setTxState = useTxStore((s) => s.setState);
  const setTxSignature = useTxStore((s) => s.setSignature);
  const setTxError = useTxStore((s) => s.setError);
  const setTxCampaignId = useTxStore((s) => s.setCampaignId);
  const resetTx = useTxStore((s) => s.reset);

  const inFlight =
    txState === 'building' ||
    txState === 'awaiting_phantom' ||
    txState === 'confirming';

  useEffect(() => {
    const { campaignId, state } = useTxStore.getState();
    if (state !== 'idle' && campaignId && campaignId !== id) {
      resetTx();
    }
  }, [id, resetTx]);

  const remaining = useMemo(
    () => (campaign ? formatDeadline(campaign.deadline) : ''),
    [campaign],
  );

  const lastClickRef = useRef(0);

  const runJoin = useCallback(async () => {
    if (!campaign || !publicKey) return;
    setTxCampaignId(campaign.id);
    setTxError(null);
    setTxSignature(null);
    setTxState('building');
    console.log(`[Join] building self-transfer tx for ${campaign.price} SOL…`);
    try {
      const txB58 = await buildSelfTransferTx(publicKey, campaign.price);
      const signature = await signAndSendTransaction(txB58);
      console.log('[Join] ✓ confirmed, flipping joined state:', signature);
      setTxSignature(signature);
      setTxState('success');
      join(campaign.id);
    } catch (e: any) {
      const msg = e?.message ?? 'Unknown error';
      console.warn('[Join] failed', msg);
      setTxError(msg);
      setTxState('error');
    }
  }, [campaign, publicKey, signAndSendTransaction, setTxError, setTxSignature, setTxState, setTxCampaignId, join]);

  const onPrimary = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 600) return;
    lastClickRef.current = now;

    if (inFlight) return;
    if (!connected) return connect();
    if (!campaign) return;
    if (joined) return leave(campaign.id);
    if (campaign.status !== 'active' || !publicKey) return;
    runJoin();
  };

  const onCloseSuccess = () => resetTx();
  const onDismissError = () => resetTx();
  const onRetry = () => {
    resetTx();
    runJoin();
  };

  if (!campaign) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>Campaign not found</Text>
          <Pressable onPress={() => router.back()} style={styles.linkBtn}>
            <Text style={styles.linkText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const canJoin = campaign.status === 'active' && !joined;
  const primaryLabel = labelForUI({
    txState,
    connected,
    joined,
    campaignStatus: campaign.status,
    price: campaign.price,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={campaign.image} style={styles.hero} contentFit="cover" />
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.metaRow}>
            <StatusPill status={campaign.status} colors={colors} />
            <Text style={styles.deadline}>{remaining}</Text>
          </View>

          <Text style={styles.title}>{campaign.title}</Text>
          <Text style={styles.seller}>by {campaign.sellerName}</Text>

          <View style={styles.statsCard}>
            <CampaignProgress
              current={campaign.currentParticipants}
              target={campaign.targetParticipants}
            />
            <View style={styles.statsRow}>
              <Stat colors={colors} label="Price" value={`${campaign.price} SOL`} />
              <View style={styles.statDivider} />
              <Stat
                colors={colors}
                label="Joined"
                value={`${campaign.currentParticipants}/${campaign.targetParticipants}`}
              />
              <View style={styles.statDivider} />
              <Stat
                colors={colors}
                label="Locked"
                value={`${(campaign.price * campaign.currentParticipants).toFixed(2)} SOL`}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this group-buy</Text>
            <Text style={styles.body}>{campaign.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How settlement works</Text>
            <Bullet colors={colors} text={`Reach ${campaign.targetParticipants} participants before the deadline.`} />
            <Bullet colors={colors} text="Funds unlock to the seller when the threshold hits." />
            <Bullet colors={colors} text="Miss it, and every participant is auto-refunded — on chain." />
          </View>
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <Pressable
          onPress={onPrimary}
          disabled={inFlight || (connected && !joined && !canJoin)}
          style={({ pressed }) => [
            styles.cta,
            pressed && styles.pressed,
            (inFlight || (connected && !joined && !canJoin)) && styles.ctaDisabled,
            joined && !inFlight && styles.ctaJoined,
          ]}>
          {inFlight ? (
            <View style={styles.ctaPending}>
              <ActivityIndicator color={colors.ctaText} />
              <Text style={styles.ctaText}>{primaryLabel}</Text>
            </View>
          ) : (
            <Text style={[styles.ctaText, joined && styles.ctaTextJoined]}>{primaryLabel}</Text>
          )}
        </Pressable>
      </View>

      {txState === 'confirming' && (
        <View style={styles.confirmingOverlay} pointerEvents="none">
          <View style={styles.confirmingCard}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.confirmingText}>Confirming on-chain…</Text>
          </View>
        </View>
      )}

      <TxSuccessModal
        visible={txState === 'success'}
        signature={txSignature}
        onClose={onCloseSuccess}
      />
      <TxErrorToast
        visible={txState === 'error'}
        message={txError}
        onRetry={canJoin && connected ? onRetry : undefined}
        onDismiss={onDismissError}
      />
    </SafeAreaView>
  );
}

function labelForUI(args: {
  txState: ReturnType<typeof useTxStore.getState>['state'];
  connected: boolean;
  joined: boolean;
  campaignStatus: Campaign['status'];
  price: number;
}): string {
  if (args.txState === 'building') return 'Preparing transaction…';
  if (args.txState === 'awaiting_phantom') return 'Open Phantom…';
  if (args.txState === 'confirming') return 'Confirming…';
  if (args.txState === 'success') return 'Joined ✓';
  if (!args.connected) return 'Connect wallet to join';
  if (args.joined) return 'You’re in — leave campaign';
  if (args.campaignStatus === 'active') return `Join for ${args.price} SOL`;
  return labelForStatus(args.campaignStatus);
}

function Stat({ colors, label, value }: { colors: ThemeColors; label: string; value: string }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Bullet({ colors, text }: { colors: ThemeColors; text: string }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function StatusPill({ colors, status }: { colors: ThemeColors; status: Campaign['status'] }) {
  const styles = makeStyles(colors);
  const map: Record<Campaign['status'], { label: string; bg: string; fg: string }> = {
    active: { label: 'Active', bg: colors.accentSoft, fg: colors.accentText },
    funded: { label: 'Funded', bg: colors.successSoft, fg: colors.success },
    expired: { label: 'Expired', bg: colors.bgInset, fg: colors.textSubtle },
    settled: { label: 'Settled', bg: colors.infoSoft, fg: colors.info },
  };
  const s = map[status];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: s.fg }]} />
      <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

function formatDeadline(deadline: number): string {
  const ms = deadline - Date.now();
  if (ms <= 0) return 'Deadline passed';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days >= 1) return `${days}d ${hours}h until deadline`;
  return `${Math.max(1, hours)}h until deadline`;
}

function labelForStatus(status: Campaign['status']): string {
  switch (status) {
    case 'funded':
      return 'Threshold hit — awaiting settle';
    case 'expired':
      return 'Campaign ended';
    case 'settled':
      return 'Settled on-chain';
    default:
      return 'Unavailable';
  }
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    scroll: { paddingBottom: 120 },

    heroWrap: { position: 'relative' },
    hero: { width: '100%', height: 280, backgroundColor: c.bgInset },
    backBtn: {
      position: 'absolute',
      top: 16,
      left: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.scrim,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    backText: { color: c.text, fontSize: 24, marginTop: -2, fontWeight: '500' },

    content: { padding: 24, gap: 18 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deadline: { color: c.textSubtle, fontSize: 13, fontWeight: '500' },
    title: { color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: -4 },
    seller: { color: c.textSubtle, fontSize: 14, marginTop: -10 },

    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    pillDot: { width: 6, height: 6, borderRadius: 3 },
    pillText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },

    statsCard: {
      backgroundColor: c.bgCard,
      borderRadius: 18,
      padding: 18,
      gap: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stat: { flex: 1, gap: 4 },
    statLabel: {
      color: c.textSubtle,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    statValue: { color: c.text, fontSize: 15, fontWeight: '600' },
    statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: c.border },

    section: { gap: 10, marginTop: 6 },
    sectionTitle: { color: c.text, fontSize: 16, fontWeight: '600' },
    body: { color: c.textMuted, fontSize: 15, lineHeight: 23 },

    bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.accent,
      marginTop: 8,
    },
    bulletText: { color: c.textMuted, fontSize: 14, lineHeight: 22, flex: 1 },

    actionBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 16,
      paddingBottom: 24,
      backgroundColor: c.scrim,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    cta: {
      backgroundColor: c.cta,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
    },
    ctaDisabled: { backgroundColor: c.ctaDisabled },
    ctaJoined: { backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.accent },
    ctaText: { color: c.ctaText, fontSize: 16, fontWeight: '600' },
    ctaPending: { flexDirection: 'row', gap: 10, alignItems: 'center' },

    confirmingOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 90,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.overlay,
    },
    confirmingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 14,
      backgroundColor: c.bgCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    confirmingText: { color: c.text, fontSize: 14, fontWeight: '500' },
    ctaTextJoined: { color: c.accentText },
    pressed: { opacity: 0.85 },

    missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    missingTitle: { color: c.text, fontSize: 18, fontWeight: '600' },
    linkBtn: { padding: 12 },
    linkText: { color: c.accentText, fontSize: 15, fontWeight: '500' },
  });
