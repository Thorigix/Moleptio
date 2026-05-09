import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { useWallet } from '@/hooks/useWallet';
import { useCampaignStore } from '@/services/campaigns/store';
import { ThemeColors, useTheme } from '@/services/theme';
import { Campaign } from '@/types/campaign';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, resolvedMode, toggle } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { connected, connecting, publicKey, connect } = useWallet();
  const campaigns = useCampaignStore((s) => s.campaigns);
  const joinedIds = useCampaignStore((s) => s.joinedIds);

  const trending = useMemo(
    () =>
      [...campaigns]
        .filter((c) => c.status === 'active' || c.status === 'funded')
        .sort((a, b) => b.price - a.price)
        .slice(0, 6),
    [campaigns],
  );

  const yourActivity = useMemo(
    () => campaigns.filter((c) => joinedIds.has(c.id)).slice(0, 4),
    [campaigns, joinedIds],
  );

  const shortKey = publicKey ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}` : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BrandLogo size={64} />
          <View style={styles.headerRight}>
            <Pressable
              onPress={toggle}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Text style={styles.iconBtnText}>{resolvedMode === 'dark' ? '☀' : '☾'}</Text>
            </Pressable>
            <WalletPill
              colors={colors}
              connected={connected}
              connecting={connecting}
              shortKey={shortKey}
              onConnect={connect}
            />
          </View>
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.heroTitle}>Buy together.{'\n'}Settle on-chain.</Text>
          <Text style={styles.heroBody}>
            Lock your share into a campaign. Hit the threshold, the seller gets paid. Miss it, every
            participant is auto-refunded.
          </Text>
        </View>

        <SectionHeader
          colors={colors}
          title="Trending campaigns"
          action="See all"
          onAction={() => router.push('/(tabs)/explore')}
        />
        {trending.length === 0 ? (
          <EmptyTile colors={colors} text="No campaigns yet — be the first to launch one." />
        ) : (
          <FlatList
            horizontal
            data={trending}
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            renderItem={({ item }) => (
              <TrendingTile
                colors={colors}
                campaign={item}
                onPress={() => router.push({ pathname: '/campaign/[id]', params: { id: item.id } })}
              />
            )}
          />
        )}

        {yourActivity.length > 0 && (
          <>
            <SectionHeader colors={colors} title="Your activity" />
            <View style={styles.activityList}>
              {yourActivity.map((c) => (
                <ActivityRow
                  key={c.id}
                  colors={colors}
                  campaign={c}
                  onPress={() =>
                    router.push({ pathname: '/campaign/[id]', params: { id: c.id } })
                  }
                />
              ))}
            </View>
          </>
        )}

        <View style={styles.ctaWrap}>
          <Pressable
            onPress={() => router.push('/campaign/create')}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
            <View style={styles.ctaInner}>
              <View style={styles.ctaPlus}>
                <Text style={styles.ctaPlusText}>＋</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Compose campaign</Text>
                <Text style={styles.ctaSubtitle}>Launch a new group-buy in under a minute.</Text>
              </View>
              <Text style={styles.ctaArrow}>›</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/bridge')}
            style={({ pressed }) => [styles.bridgeCard, pressed && styles.pressed]}>
            <View style={styles.bridgeIcon}>
              <Text style={styles.bridgeIconText}>⇄</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bridgeTitle}>Fund with cross-chain assets</Text>
              <Text style={styles.bridgeSub}>Bridge USDC from EVM chains via LI.FI.</Text>
            </View>
            <Text style={styles.bridgeArrow}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/how-it-works')}
            hitSlop={8}
            style={({ pressed }) => [styles.howLink, pressed && styles.pressed]}>
            <Text style={styles.howLinkText}>How it works  ›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WalletPill({
  colors,
  connected,
  connecting,
  shortKey,
  onConnect,
}: {
  colors: ThemeColors;
  connected: boolean;
  connecting: boolean;
  shortKey: string | null;
  onConnect: () => void;
}) {
  const styles = makeStyles(colors);
  if (connected && shortKey) {
    return (
      <View style={styles.walletPill}>
        <View style={styles.walletDot} />
        <Text style={styles.walletPillText}>{shortKey}</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onConnect}
      disabled={connecting}
      style={({ pressed }) => [styles.connectBtn, pressed && styles.pressed]}>
      {connecting ? (
        <ActivityIndicator color={colors.ctaText} size="small" />
      ) : (
        <Text style={styles.connectBtnText}>Connect</Text>
      )}
    </Pressable>
  );
}

function SectionHeader({
  colors,
  title,
  action,
  onAction,
}: {
  colors: ThemeColors;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function TrendingTile({
  colors,
  campaign,
  onPress,
}: {
  colors: ThemeColors;
  campaign: Campaign;
  onPress: () => void;
}) {
  const styles = makeStyles(colors);
  const pct = Math.min(
    100,
    Math.round((campaign.currentParticipants / campaign.targetParticipants) * 100),
  );
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <Image source={campaign.image} style={styles.tileImage} contentFit="cover" />
      <View style={styles.tileBody}>
        <Text style={styles.tilePrice}>{campaign.price} SOL</Text>
        <Text style={styles.tileTitle} numberOfLines={2}>
          {campaign.title}
        </Text>
        <View style={styles.tileBar}>
          <View style={[styles.tileBarFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.tileMeta}>
          {campaign.currentParticipants}/{campaign.targetParticipants} joined
        </Text>
      </View>
    </Pressable>
  );
}

function ActivityRow({
  colors,
  campaign,
  onPress,
}: {
  colors: ThemeColors;
  campaign: Campaign;
  onPress: () => void;
}) {
  const styles = makeStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]}>
      <Image source={campaign.image} style={styles.activityThumb} contentFit="cover" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.activityTitle} numberOfLines={1}>
          {campaign.title}
        </Text>
        <Text style={styles.activitySub}>
          {campaign.currentParticipants}/{campaign.targetParticipants} · {campaign.price} SOL
        </Text>
      </View>
      <View style={styles.activityBadge}>
        <Text style={styles.activityBadgeText}>Joined</Text>
      </View>
    </Pressable>
  );
}

function EmptyTile({ colors, text }: { colors: ThemeColors; text: string }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    scroll: { paddingBottom: 36, gap: 22 },

    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnText: { color: c.text, fontSize: 16 },

    walletPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentSoft,
    },
    walletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.success },
    walletPillText: { color: c.accentText, fontSize: 12, fontWeight: '600' },
    connectBtn: {
      backgroundColor: c.cta,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
    },
    connectBtnText: { color: c.ctaText, fontSize: 13, fontWeight: '600' },

    heroBlock: { paddingHorizontal: 20, gap: 8, marginTop: 8 },
    heroTitle: { color: c.text, fontSize: 34, fontWeight: '700', letterSpacing: -0.8, lineHeight: 40 },
    heroBody: { color: c.textMuted, fontSize: 15, lineHeight: 22, marginTop: 4 },

    sectionHeader: {
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: { color: c.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
    sectionAction: { color: c.accentText, fontSize: 13, fontWeight: '600' },

    hList: { paddingHorizontal: 20 },
    tile: {
      width: 220,
      backgroundColor: c.bgCard,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    tileImage: { width: '100%', height: 120, backgroundColor: c.bgInset },
    tileBody: { padding: 12, gap: 6 },
    tilePrice: { color: c.accentText, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
    tileTitle: { color: c.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
    tileBar: {
      height: 4,
      borderRadius: 2,
      backgroundColor: c.bgInset,
      overflow: 'hidden',
      marginTop: 4,
    },
    tileBarFill: { height: '100%', backgroundColor: c.accent, borderRadius: 2 },
    tileMeta: { color: c.textSubtle, fontSize: 11, fontWeight: '500' },

    activityList: { paddingHorizontal: 20, gap: 10 },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.bgCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 10,
    },
    activityThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: c.bgInset },
    activityTitle: { color: c.text, fontSize: 14, fontWeight: '600' },
    activitySub: { color: c.textSubtle, fontSize: 12 },
    activityBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.successSoft,
    },
    activityBadgeText: { color: c.success, fontSize: 11, fontWeight: '700' },

    ctaWrap: { paddingHorizontal: 20, marginTop: 4 },
    cta: {
      backgroundColor: c.cta,
      borderRadius: 20,
      padding: 18,
    },
    ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    ctaPlus: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaPlusText: { color: c.ctaText, fontSize: 22, fontWeight: '300', marginTop: -2 },
    ctaTitle: { color: c.ctaText, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
    ctaSubtitle: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginTop: 2 },
    ctaArrow: { color: c.ctaText, fontSize: 28, fontWeight: '300', opacity: 0.85 },

    bridgeCard: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
    },
    bridgeIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bridgeIconText: { color: c.accentText, fontSize: 18, fontWeight: '700' },
    bridgeTitle: { color: c.text, fontSize: 14, fontWeight: '700' },
    bridgeSub: { color: c.textSubtle, fontSize: 12, marginTop: 2 },
    bridgeArrow: { color: c.textSubtle, fontSize: 22, fontWeight: '300' },

    howLink: { alignSelf: 'center', marginTop: 16, paddingVertical: 8, paddingHorizontal: 12 },
    howLinkText: { color: c.accentText, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },

    empty: {
      marginHorizontal: 20,
      padding: 18,
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.border,
      alignItems: 'center',
    },
    emptyText: { color: c.textSubtle, fontSize: 13 },

    pressed: { opacity: 0.85 },
  });
