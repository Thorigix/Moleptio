import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ExecuteReceipt, SupportedChainKey } from '@/services/lifi';

type BridgeRecord = {
  id: string;
  amountUsdc: string;
  fromChain: SupportedChainKey;
  toolNames: string[];
  at: number;
};

type BridgeStore = {
  totalUsdc: number;
  history: BridgeRecord[];
  recordReceipt: (r: ExecuteReceipt) => void;
  reset: () => void;
};

export const useBridgeStore = create<BridgeStore>()(
  persist(
    (set, get) => ({
      totalUsdc: 0,
      history: [],
      recordReceipt: (r) => {
        const amount = Number(r.receivedUsdc) || 0;
        const rec: BridgeRecord = {
          id: r.routeId,
          amountUsdc: r.receivedUsdc,
          fromChain: r.fromChain,
          toolNames: r.toolNames,
          at: r.startedAt,
        };
        set({
          totalUsdc: get().totalUsdc + amount,
          history: [rec, ...get().history].slice(0, 20),
        });
      },
      reset: () => set({ totalUsdc: 0, history: [] }),
    }),
    {
      name: 'moleptio.bridge',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
