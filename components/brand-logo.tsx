import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '@/services/theme';

const LIGHT_THEME_LOGO = require('@/assets/images/MoleptioDark.png');
const DARK_THEME_LOGO = require('@/assets/images/MoleptioLight.png');

type Props = {
  size?: number;
  wordmarkSize?: number;
  showWordmark?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function BrandLogo({ size = 36, wordmarkSize = 20, showWordmark = true, style }: Props) {
  const { resolvedMode, colors } = useTheme();
  const source = resolvedMode === 'dark' ? DARK_THEME_LOGO : LIGHT_THEME_LOGO;
  return (
    <View style={[styles.row, style]}>
      <Image
        source={source}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
      {showWordmark && (
        <Text style={[styles.wordmark, { color: colors.text, fontSize: wordmarkSize }]}>
          Moleptio
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: { fontWeight: '700', letterSpacing: -0.5 },
});
