import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedMode = 'light' | 'dark';

export type ThemeColors = {
  bg: string;
  bgElevated: string;
  bgCard: string;
  bgInset: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  cta: string;
  ctaText: string;
  ctaDisabled: string;
  success: string;
  successSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  scrim: string;
  pressedTint: string;
};

const light: ThemeColors = {
  bg: '#FFFFFF',
  bgElevated: '#F7F7FB',
  bgCard: '#FFFFFF',
  bgInset: '#F1F1F6',
  border: '#EAEAEF',
  borderStrong: '#D9D9E0',
  text: '#0B0B12',
  textMuted: '#3D3D4A',
  textSubtle: '#7A7A88',
  accent: '#7C3AED',
  accentSoft: 'rgba(124, 58, 237, 0.10)',
  accentText: '#6B21D9',
  cta: '#7C3AED',
  ctaText: '#FFFFFF',
  ctaDisabled: '#E2E2E8',
  success: '#16A34A',
  successSoft: 'rgba(22, 163, 74, 0.10)',
  error: '#DC2626',
  errorSoft: 'rgba(220, 38, 38, 0.10)',
  info: '#0284C7',
  infoSoft: 'rgba(2, 132, 199, 0.12)',
  overlay: 'rgba(11, 11, 18, 0.45)',
  scrim: 'rgba(255, 255, 255, 0.94)',
  pressedTint: 'rgba(11, 11, 18, 0.06)',
};

const dark: ThemeColors = {
  bg: '#0B0B12',
  bgElevated: '#15151F',
  bgCard: '#15151F',
  bgInset: '#0F0F18',
  border: '#1F1F2C',
  borderStrong: '#2A2A3A',
  text: '#FFFFFF',
  textMuted: '#C9C9D6',
  textSubtle: '#8A8A99',
  accent: '#A78BFA',
  accentSoft: 'rgba(124, 58, 237, 0.18)',
  accentText: '#A78BFA',
  cta: '#7C3AED',
  ctaText: '#FFFFFF',
  ctaDisabled: '#2A2A3A',
  success: '#4ADE80',
  successSoft: 'rgba(74, 222, 128, 0.14)',
  error: '#F87171',
  errorSoft: 'rgba(248, 113, 113, 0.14)',
  info: '#38BDF8',
  infoSoft: 'rgba(56, 189, 248, 0.14)',
  overlay: 'rgba(5, 5, 10, 0.78)',
  scrim: 'rgba(11, 11, 18, 0.92)',
  pressedTint: 'rgba(255, 255, 255, 0.08)',
};

export const palettes = { light, dark } as const;

type ThemeStore = {
  mode: ThemeMode;
  systemMode: ResolvedMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
  _setSystemMode: (m: ResolvedMode) => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'system',
      systemMode: (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light') as ResolvedMode,
      setMode: (mode) => set({ mode }),
      toggle: () => {
        const { mode, systemMode } = get();
        const resolved = mode === 'system' ? systemMode : mode;
        set({ mode: resolved === 'dark' ? 'light' : 'dark' });
      },
      _setSystemMode: (systemMode) => set({ systemMode }),
    }),
    {
      name: 'moleptio.theme',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ mode: s.mode }),
    },
  ),
);

export function useThemeSystemListener() {
  const setSystem = useThemeStore((s) => s._setSystemMode);
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, [setSystem]);
}

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const systemMode = useThemeStore((s) => s.systemMode);
  const setMode = useThemeStore((s) => s.setMode);
  const toggle = useThemeStore((s) => s.toggle);
  const resolved: ResolvedMode = mode === 'system' ? systemMode : mode;
  return { mode, resolvedMode: resolved, colors: palettes[resolved], setMode, toggle };
}
