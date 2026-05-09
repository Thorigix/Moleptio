import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { ThemeColors, useTheme } from '@/services/theme';

export default function HowItWorksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹  Back</Text>
          </Pressable>
          <BrandLogo size={36} />
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.intro}>
          <Text style={styles.kicker}>How it works</Text>
          <Text style={styles.title}>Group-buy power,{'\n'}settled on Solana.</Text>
          <Text style={styles.lede}>
            Moleptio is a mobile group-buy marketplace. Users pool their share into a campaign,
            and when the threshold is met, the deal goes through — instantly, on-chain.
          </Text>
        </View>

        <Card colors={colors}>
          <Text style={styles.cardEyebrow}>What is Moleptio?</Text>
          <Text style={styles.cardBody}>
            A group-buy marketplace powered by Solana. Discover campaigns, lock in your spot with a
            single Phantom approval, and settle the deal trustlessly on-chain.
          </Text>
        </Card>

        <View style={styles.sectionGap}>
          <Text style={styles.sectionTitle}>The flow</Text>

          <Step
            colors={colors}
            n={1}
            title="Connect wallet"
            body="Tap Connect to link your Phantom wallet. Moleptio never holds your keys — every action is approved by you."
          />
          <Step
            colors={colors}
            n={2}
            title="Join a campaign"
            body="Pick a campaign, hit Join, and approve the transaction in Phantom. Payment is processed on Solana devnet in seconds."
          />
          <Step
            colors={colors}
            n={3}
            title="Secure escrow-like settlement"
            body="Funds flow through a secure escrow-like payment system. They are released to the seller once the campaign hits its threshold; if the campaign doesn't fund, participants are made whole."
          />
        </View>

        <Card colors={colors}>
          <Text style={styles.cardEyebrow}>Security model</Text>
          <Bullet colors={colors} text="Every transaction is signed by your wallet — Moleptio cannot move funds on your behalf." />
          <Bullet colors={colors} text="Payment flow is governed by on-chain rules, not a third-party custodian." />
          <Bullet colors={colors} text="No off-chain account, no hidden balance — you stay in control of your assets." />
          <Bullet colors={colors} text="Every transaction is publicly auditable on the Solana explorer." />
        </Card>

        <Card colors={colors} accent>
          <Text style={[styles.cardEyebrow, { color: colors.accentText }]}>What's next</Text>
          <Bullet colors={colors} text="Cross-chain campaigns via Li.Fi (planned)." />
          <Bullet colors={colors} text="Advanced escrow logic with multi-party settlement (planned)." />
          <Bullet colors={colors} text="Seller dashboards and reputation signals (planned)." />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Built for Solana · Devnet · Phantom-native
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({
  colors,
  accent,
  children,
}: {
  colors: ThemeColors;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const styles = makeStyles(colors);
  return <View style={[styles.card, accent && styles.cardAccent]}>{children}</View>;
}

function Step({
  colors,
  n,
  title,
  body,
}: {
  colors: ThemeColors;
  n: number;
  title: string;
  body: string;
}) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <View style={styles.stepBody}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{body}</Text>
      </View>
    </View>
  );
}

function Bullet({ colors, text }: { colors: ThemeColors; text: string }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
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
      fontSize: 30,
      fontWeight: '700',
      letterSpacing: -0.6,
      lineHeight: 36,
    },
    lede: { color: c.textMuted, fontSize: 15, lineHeight: 22 },

    sectionGap: { paddingHorizontal: 20, gap: 12 },
    sectionTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: -0.3,
      marginTop: 4,
    },

    card: {
      marginHorizontal: 20,
      backgroundColor: c.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
      gap: 10,
    },
    cardAccent: {
      backgroundColor: c.accentSoft,
      borderColor: c.accentSoft,
    },
    cardEyebrow: {
      color: c.textSubtle,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    cardBody: { color: c.textMuted, fontSize: 14, lineHeight: 21 },

    step: {
      flexDirection: 'row',
      gap: 14,
      backgroundColor: c.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
    },
    stepNum: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumText: { color: c.accentText, fontSize: 14, fontWeight: '700' },
    stepBody: { flex: 1, gap: 4 },
    stepTitle: { color: c.text, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
    stepText: { color: c.textMuted, fontSize: 13, lineHeight: 20 },

    bulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.accent,
      marginTop: 8,
    },
    bulletText: { color: c.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },

    footer: { paddingHorizontal: 20, alignItems: 'center', marginTop: 6 },
    footerText: { color: c.textSubtle, fontSize: 12, letterSpacing: 0.4 },

    pressed: { opacity: 0.6 },
  });
