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

export type TxRecord = {
  signature: string;
  ts: number;
};

// Persistence note:
// EVERY persisted slice on this store is a plain JSON value (string, number,
// boolean, plain object, or array of those). Set/Map/class instances do NOT
// serialize through AsyncStorage's JSON layer reliably — that bug landed us
// here. `joinedIds` is a Record<id, true> so a key existence check is a
// simple `joinedIds[id] === true`.
type CampaignState = {
  campaigns: Campaign[];

  userCampaigns: Campaign[];
  joinedIds: Record<string, true>;
  participantBumps: Record<string, number>;
  txByCampaign: Record<string, TxRecord>;

  _hasHydrated: boolean;

  getById: (id: string) => Campaign | undefined;
  isJoined: (id: string) => boolean;
  refreshStatuses: () => void;
  createCampaign: (input: CampaignInput) => Campaign;
  join: (id: string) => void;
  recordTx: (id: string, signature: string) => void;
  reset: () => void;
};

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=1200&q=80';

const newId = () =>
  `cmp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function deriveStatus(c: Campaign, now: number): Campaign['status'] {
  // Settled is terminal.
  if (c.status === 'settled') return 'settled';
  // Threshold met has priority over time expiry.
  if (c.currentParticipants >= c.targetParticipants) return 'funded';
  // If deadline has passed and threshold is not met.
  if (now >= c.deadline) return 'expired';
  return 'active';
}

function deriveCampaigns(
  userCampaigns: Campaign[],
  bumps: Record<string, number>,
): Campaign[] {
  const merged: Campaign[] = [...userCampaigns, ...SEED_CAMPAIGNS];
  const now = Date.now();
  return merged.map((c) => {
    const bump = bumps[c.id] ?? 0;
    const nextParticipants = bump
      ? Math.max(0, Math.min(c.targetParticipants, c.currentParticipants + bump))
      : c.currentParticipants;

    const nextStatus = deriveStatus(
      bump ? { ...c, currentParticipants: nextParticipants } : c,
      now,
    );

    if (!bump && nextStatus === c.status) return c;
    return { ...c, currentParticipants: nextParticipants, status: nextStatus };
  });
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      campaigns: SEED_CAMPAIGNS,
      userCampaigns: [],
      joinedIds: {},
      participantBumps: {},
      txByCampaign: {},
      _hasHydrated: false,

      getById: (id) => get().campaigns.find((c) => c.id === id),
      isJoined: (id) => get().joinedIds[id] === true,

      refreshStatuses: () =>
        set((state) => ({
          campaigns: deriveCampaigns(state.userCampaigns, state.participantBumps),
        })),

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
        set((state) => {
          const userCampaigns = [campaign, ...state.userCampaigns];
          return {
            userCampaigns,
            campaigns: deriveCampaigns(userCampaigns, state.participantBumps),
          };
        });
        return campaign;
      },

      join: (id) =>
        set((state) => {
          if (state.joinedIds[id]) return state;
          const joinedIds = { ...state.joinedIds, [id]: true as const };
          const participantBumps = {
            ...state.participantBumps,
            [id]: (state.participantBumps[id] ?? 0) + 1,
          };
          console.log('[PERSIST] join →', id);
          return {
            joinedIds,
            participantBumps,
            campaigns: deriveCampaigns(state.userCampaigns, participantBumps),
          };
        }),

      recordTx: (id, signature) =>
        set((state) => {
          console.log('[PERSIST] recordTx', id, signature.slice(0, 8) + '…');
          return {
            txByCampaign: {
              ...state.txByCampaign,
              [id]: { signature, ts: Date.now() },
            },
          };
        }),

      reset: () =>
        set({
          campaigns: SEED_CAMPAIGNS,
          userCampaigns: [],
          joinedIds: {},
          participantBumps: {},
          txByCampaign: {},
        }),
    }),
    {
      name: 'moleptio.campaigns',
      // v3: joinedIds is Record<string, true> instead of Set/array.
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        joinedIds: state.joinedIds,
        userCampaigns: state.userCampaigns,
        participantBumps: state.participantBumps,
        txByCampaign: state.txByCampaign,
      }),
      migrate: (persisted, fromVersion) => {
        const p = (persisted ?? {}) as Record<string, any>;

        // v1 → v3: only joinedIds existed, as string[]
        // v2 → v3: joinedIds was string[]; everything else already shaped
        if (fromVersion < 3) {
          const joinedIdsArray: string[] = Array.isArray(p.joinedIds)
            ? (p.joinedIds as string[])
            : [];
          const joinedIds: Record<string, true> = {};
          for (const id of joinedIdsArray) joinedIds[id] = true;
          console.log(
            `[PERSIST] migrated v${fromVersion} → v3, joinedIds=${joinedIdsArray.length}`,
          );
          return {
            joinedIds,
            userCampaigns: Array.isArray(p.userCampaigns) ? p.userCampaigns : [],
            participantBumps:
              p.participantBumps && typeof p.participantBumps === 'object'
                ? p.participantBumps
                : {},
            txByCampaign:
              p.txByCampaign && typeof p.txByCampaign === 'object'
                ? p.txByCampaign
                : {},
          };
        }
        return persisted as any;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<{
          joinedIds: Record<string, true>;
          userCampaigns: Campaign[];
          participantBumps: Record<string, number>;
          txByCampaign: Record<string, TxRecord>;
        }>;
        const userCampaigns = p.userCampaigns ?? [];
        const participantBumps = p.participantBumps ?? {};
        const joinedIds = p.joinedIds ?? {};
        return {
          ...current,
          userCampaigns,
          joinedIds,
          participantBumps,
          txByCampaign: p.txByCampaign ?? {},
          campaigns: deriveCampaigns(userCampaigns, participantBumps),
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[PERSIST] rehydrate failed', error);
        } else {
          const ids = state ? Object.keys(state.joinedIds ?? {}) : [];
          const userCount = state?.userCampaigns?.length ?? 0;
          const txCount = Object.keys(state?.txByCampaign ?? {}).length;
          console.log('[PERSIST] hydrated');
          console.log('[PERSIST] restored joinedIds:', ids);
          console.log(
            `[PERSIST] restored userCampaigns=${userCount} txRecords=${txCount}`,
          );
        }
        useCampaignStore.setState({ _hasHydrated: true });

        // Storage integrity — read the raw JSON blob out of AsyncStorage and
        // verify it round-trips correctly. Runs after the in-memory hydration
        // so it never blocks the UI.
        AsyncStorage.getItem('moleptio.campaigns')
          .then((raw) => {
            if (!raw) {
              console.log('[PERSIST] storage: no entry yet (first launch)');
              return;
            }
            try {
              const blob = JSON.parse(raw) as {
                version?: number;
                state?: {
                  joinedIds?: Record<string, true>;
                  txByCampaign?: Record<string, unknown>;
                  userCampaigns?: unknown[];
                  participantBumps?: Record<string, number>;
                };
              };
              const storedVersion = blob.version ?? '?';
              const storedIds = Object.keys(blob.state?.joinedIds ?? {});
              const storedTx = Object.keys(blob.state?.txByCampaign ?? {}).length;
              const storedUser = blob.state?.userCampaigns?.length ?? 0;
              console.log(
                `[PERSIST] storage integrity OK — v${storedVersion}`,
                `joinedIds=${storedIds.length}`,
                `txRecords=${storedTx}`,
                `userCampaigns=${storedUser}`,
              );
              if (storedIds.length > 0) {
                console.log('[PERSIST] storage joinedIds:', storedIds);
              }
            } catch (parseErr) {
              console.error('[PERSIST] storage integrity FAIL — JSON parse error', parseErr);
            }
          })
          .catch((e) => console.error('[PERSIST] storage read error', e));
      },
    },
  ),
);

export const useCampaignsHydrated = () =>
  useCampaignStore((s) => s._hasHydrated);
