import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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

import { useCampaignStore } from '@/services/campaigns/store';
import { ThemeColors, useTheme } from '@/services/theme';

type Errors = Partial<Record<'title' | 'price' | 'target', string>>;

export default function CreateCampaignScreen() {
  const router = useRouter();
  const createCampaign = useCampaignStore((s) => s.createCampaign);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceText, setPriceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [image, setImage] = useState('');
  const [touched, setTouched] = useState(false);

  const errors = useMemo<Errors>(() => {
    const e: Errors = {};
    if (!title.trim()) e.title = 'Title is required';
    const price = Number(priceText);
    if (!priceText || isNaN(price) || price <= 0) e.price = 'Must be greater than 0';
    const target = Number(targetText);
    if (!targetText || !Number.isInteger(target) || target <= 0)
      e.target = 'Must be a whole number > 0';
    return e;
  }, [title, priceText, targetText]);

  const valid = Object.keys(errors).length === 0;

  const onSubmit = () => {
    setTouched(true);
    if (!valid) return;
    createCampaign({
      title,
      description,
      price: Number(priceText),
      targetParticipants: Number(targetText),
      image: image || undefined,
    });
    router.back();
  };

  const showErr = (k: keyof Errors) => touched && errors[k];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>New campaign</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.lede}>
            Set the threshold. Buyers lock SOL in escrow until you hit it.
          </Text>

          <Field
            colors={colors}
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Aurora keyboard, indigo linen run…"
            error={showErr('title')}
          />

          <Field
            colors={colors}
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What is it, who's it for, why a group-buy?"
            multiline
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field
                colors={colors}
                label="Price (SOL)"
                value={priceText}
                onChangeText={setPriceText}
                placeholder="0.45"
                keyboardType="decimal-pad"
                error={showErr('price')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                colors={colors}
                label="Target buyers"
                value={targetText}
                onChangeText={setTargetText}
                placeholder="100"
                keyboardType="number-pad"
                error={showErr('target')}
              />
            </View>
          </View>

          <Field
            colors={colors}
            label="Image URL"
            sublabel="Optional"
            value={image}
            onChangeText={setImage}
            placeholder="https://…"
            autoCapitalize="none"
          />

          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewTitle}>{title || 'Untitled campaign'}</Text>
            <Text style={styles.previewMeta}>
              {priceText || '0'} SOL · {targetText || '0'} buyers · 7d window
            </Text>
          </View>
        </ScrollView>

        <View style={styles.actionBar}>
          <Pressable
            onPress={onSubmit}
            disabled={touched && !valid}
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.pressed,
              touched && !valid && styles.ctaDisabled,
            ]}>
            <Text style={styles.ctaText}>Create campaign</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  colors: ThemeColors;
  label: string;
  sublabel?: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences';
  error?: string | false;
};

function Field({
  colors,
  label,
  sublabel,
  error,
  multiline,
  ...rest
}: FieldProps) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {sublabel && <Text style={styles.fieldSublabel}>{sublabel}</Text>}
      </View>
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={colors.textSubtle}
        style={[
          styles.input,
          multiline && styles.inputMulti,
          error && styles.inputError,
        ]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
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
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
    },
    backText: { color: c.text, fontSize: 24, marginTop: -2, fontWeight: '500' },
    headerTitle: { color: c.text, fontSize: 16, fontWeight: '600' },

    scroll: { padding: 24, paddingBottom: 140, gap: 18 },
    lede: { color: c.textSubtle, fontSize: 14, lineHeight: 21, marginBottom: 4 },

    field: { gap: 8 },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    fieldLabel: {
      color: c.text,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    fieldSublabel: { color: c.textSubtle, fontSize: 11, fontWeight: '500' },
    input: {
      backgroundColor: c.bgElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.text,
      fontSize: 15,
    },
    inputMulti: { minHeight: 100, textAlignVertical: 'top' },
    inputError: { borderColor: c.error },
    errorText: { color: c.error, fontSize: 12 },

    row: { flexDirection: 'row', gap: 12 },

    previewBox: {
      backgroundColor: c.bgInset,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      gap: 4,
      marginTop: 4,
    },
    previewLabel: {
      color: c.textSubtle,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    previewTitle: { color: c.text, fontSize: 16, fontWeight: '600' },
    previewMeta: { color: c.accentText, fontSize: 13 },

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
    ctaText: { color: c.ctaText, fontSize: 16, fontWeight: '600' },
    pressed: { opacity: 0.85 },
  });
