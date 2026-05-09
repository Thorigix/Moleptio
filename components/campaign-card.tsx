import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors, useTheme } from '@/services/theme';
import { Campaign } from '@/types/campaign';
import { CampaignProgress } from './campaign-progress';

type Props = { campaign: Campaign };

export function CampaignCard({ campaign }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const remaining = useMemo(() => formatRemaining(campaign.deadline), [campaign.deadline]);
  const badge = useMemo(() => statusBadges(colors)[campaign.status], [colors, campaign.status]);

  return (
    <Pressable
      onPress={() => router.push(`/campaign/${campaign.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image source={campaign.image} style={styles.image} contentFit="cover" transition={200} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <View style={[styles.dot, { backgroundColor: badge.fg }]} />
            <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
          </View>
          <Text style={styles.deadline}>{remaining}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {campaign.title}
        </Text>
        <Text style={styles.seller}>by {campaign.sellerName}</Text>

        <CampaignProgress
          current={campaign.currentParticipants}
          target={campaign.targetParticipants}
        />

        <View style={styles.footer}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.price}>
            {campaign.price} <Text style={styles.priceUnit}>SOL</Text>
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const statusBadges = (
  c: ThemeColors,
): Record<Campaign['status'], { label: string; bg: string; fg: string }> => ({
  active: { label: 'Active', bg: c.accentSoft, fg: c.accentText },
  funded: { label: 'Funded', bg: c.successSoft, fg: c.success },
  expired: { label: 'Expired', bg: c.bgInset, fg: c.textSubtle },
  settled: { label: 'Settled', bg: c.infoSoft, fg: c.info },
});

function formatRemaining(deadline: number): string {
  const ms = deadline - Date.now();
  if (ms <= 0) return 'Ended';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}d left`;
  const hours = Math.max(1, Math.floor(ms / (60 * 60 * 1000)));
  return `${hours}h left`;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.bgCard,
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    pressed: { opacity: 0.85 },
    image: { width: '100%', height: 170, backgroundColor: c.bgInset },
    body: { padding: 16, gap: 12 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
    deadline: { color: c.textSubtle, fontSize: 12, fontWeight: '500' },
    title: { color: c.text, fontSize: 18, fontWeight: '600', letterSpacing: -0.2 },
    seller: { color: c.textSubtle, fontSize: 13, marginTop: -6 },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 4,
    },
    priceLabel: {
      color: c.textSubtle,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    price: { color: c.text, fontSize: 18, fontWeight: '700' },
    priceUnit: { color: c.accentText, fontSize: 13, fontWeight: '600' },
  });
