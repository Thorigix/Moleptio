import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampaignCard } from '@/components/campaign-card';
import { useCampaignStore } from '@/services/campaigns/store';
import { ThemeColors, useTheme } from '@/services/theme';

export default function CampaignsScreen() {
  const campaigns = useCampaignStore((s) => s.campaigns);
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={campaigns}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Campaigns</Text>
              <Pressable
                onPress={() => router.push('/campaign/create')}
                style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}>
                <Text style={styles.createBtnText}>+ Create</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>
              Open group-buys. Lock your share — settle when threshold hits.
            </Text>
          </View>
        }
        renderItem={({ item }) => <CampaignCard campaign={item} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    list: { padding: 24, paddingBottom: 48 },
    header: { gap: 8, marginBottom: 20 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: { color: c.text, fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
    subtitle: { color: c.textSubtle, fontSize: 15, lineHeight: 22 },
    createBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentSoft,
    },
    createBtnText: { color: c.accentText, fontSize: 13, fontWeight: '600' },
    pressed: { opacity: 0.7 },
  });
