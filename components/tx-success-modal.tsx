import * as Linking from 'expo-linking';
import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors, useTheme } from '@/services/theme';
import { explorerUrl } from '@/services/tx/state';

type Props = {
  visible: boolean;
  signature: string | null;
  onClose: () => void;
};

export function TxSuccessModal({ visible, signature, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const short = signature ? `${signature.slice(0, 5)}…${signature.slice(-4)}` : '';

  const openExplorer = () => {
    if (signature) Linking.openURL(explorerUrl(signature));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.checkRing}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.title}>Transaction confirmed</Text>
          <Text style={styles.subtitle}>You’re locked into this group-buy.</Text>

          <View style={styles.sigBox}>
            <Text style={styles.sigLabel}>Signature</Text>
            <Text style={styles.sigValue}>{short}</Text>
          </View>

          <Pressable
            onPress={openExplorer}
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}>
            <Text style={styles.btnPrimaryText}>View on Explorer</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}>
            <Text style={styles.btnSecondaryText}>Back to campaign</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.bgCard,
      padding: 28,
      paddingBottom: 36,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      gap: 14,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: c.border,
      alignItems: 'stretch',
    },
    checkRing: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.successSoft,
      borderWidth: 1,
      borderColor: c.success,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkMark: { color: c.success, fontSize: 28, fontWeight: '700', lineHeight: 30 },
    title: {
      color: c.text,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.3,
      marginTop: 4,
    },
    subtitle: { color: c.textSubtle, fontSize: 14, textAlign: 'center', marginBottom: 6 },

    sigBox: {
      backgroundColor: c.bgInset,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 4,
      alignItems: 'center',
    },
    sigLabel: {
      color: c.textSubtle,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    sigValue: { color: c.accentText, fontSize: 15, fontFamily: 'Courier', fontWeight: '600' },

    btnPrimary: {
      backgroundColor: c.cta,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 6,
    },
    btnPrimaryText: { color: c.ctaText, fontSize: 15, fontWeight: '600' },
    btnSecondary: {
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    btnSecondaryText: { color: c.textMuted, fontSize: 14, fontWeight: '500' },
    pressed: { opacity: 0.85 },
  });
