import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors, useTheme } from '@/services/theme';

type Props = {
  current: number;
  target: number;
  compact?: boolean;
};

export function CampaignProgress({ current, target, compact }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pct = Math.min(1, target === 0 ? 0 : current / target);
  const pctLabel = Math.round(pct * 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pctLabel}%` }]} />
      </View>
      {!compact && (
        <View style={styles.row}>
          <Text style={styles.count}>
            {current}
            <Text style={styles.muted}> / {target} joined</Text>
          </Text>
          <Text style={styles.pct}>{pctLabel}%</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { gap: 8 },
    track: {
      height: 6,
      borderRadius: 999,
      backgroundColor: c.bgInset,
      overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: c.accent, borderRadius: 999 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    count: { color: c.text, fontSize: 13, fontWeight: '600' },
    muted: { color: c.textSubtle, fontWeight: '400' },
    pct: { color: c.accentText, fontSize: 13, fontWeight: '600' },
  });
