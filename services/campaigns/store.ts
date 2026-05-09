import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Campaign } from '@/types/campaign';
import { SEED_CAMPAIGNS } from './seed';

export type CampaignInput = {
  title: string;
  description: string;
  image?: string;
  price: number;
  targetParticipants: number;
  deadline?: number;
  sellerName?: string;
};

type CampaignState = {
  campaigns: Campaign[];
  joinedIds: Set<string>;
  getById: (id: string) => Campaign | undefined;
  createCampaign: (input: CampaignInput) => Campaign;
  join: (id: string) => void;
  leave: (id: string) => void;
  reset: () => void;
};

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=1200&q=80';

const newId = () =>
  `cmp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      campaigns: SEED_CAMPAIGNS,
      joinedIds: new Set<string>(),

      getById: (id) => get().campaigns.find((c) => c.id === id),

      createCampaign: (input) => {
        const campaign: Campaign = {
          id: newId(),
          title: input.title.trim(),
          description: input.description.trim(),
          image: input.image?.trim() || DEFAULT_IMAGE,
          price: input.price,
          targetParticipants: input.targetParticipants,
          currentParticipants: 0,
          deadline: input.deadline ?? Date.now() + 7 * 24 * 60 * 60 * 1000,
          sellerName: input.sellerName?.trim() || 'You',
          status: 'active',
        };
        set((state) => ({ campaigns: [campaign, ...state.campaigns] }));
        return campaign;
      },

      join: (id) =>
        set((state) => {
          if (state.joinedIds.has(id)) return state;
          const joinedIds = new Set(state.joinedIds);
          joinedIds.add(id);
          const campaigns = state.campaigns.map((c) => {
            if (c.id !== id) return c;
            const next = c.currentParticipants + 1;
            const status = next >= c.targetParticipants ? 'funded' : c.status;
            return { ...c, currentParticipants: next, status };
          });
          return { joinedIds, campaigns };
        }),

      leave: (id) =>
        set((state) => {
          if (!state.joinedIds.has(id)) return state;
          const joinedIds = new Set(state.joinedIds);
          joinedIds.delete(id);
          const campaigns = state.campaigns.map((c) =>
            c.id === id
              ? { ...c, currentParticipants: Math.max(0, c.currentParticipants - 1) }
              : c,
          );
          return { joinedIds, campaigns };
        }),

      reset: () => set({ campaigns: SEED_CAMPAIGNS, joinedIds: new Set<string>() }),
    }),
    {
      name: 'moleptio.campaigns',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist what the user actually accumulates. Seed campaigns and
      // mid-flight currentParticipants stay in-memory; rehydrating those
      // would fight the seed data on every release.
      partialize: (state) => ({ joinedIds: Array.from(state.joinedIds) }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { joinedIds?: string[] };
        return {
          ...current,
          joinedIds: new Set<string>(p.joinedIds ?? []),
        };
      },
    },
  ),
);
