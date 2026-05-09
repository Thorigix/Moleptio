import { create } from 'zustand';

export type TxState =
  | 'idle'
  | 'building'
  | 'awaiting_phantom'
  | 'confirming'
  | 'success'
  | 'error';

type TxStore = {
  state: TxState;
  signature: string | null;
  error: string | null;
  campaignId: string | null;
  setState: (s: TxState) => void;
  setSignature: (sig: string | null) => void;
  setError: (e: string | null) => void;
  setCampaignId: (id: string | null) => void;
  reset: () => void;
};

export const useTxStore = create<TxStore>((set) => ({
  state: 'idle',
  signature: null,
  error: null,
  campaignId: null,
  setState: (s) => {
    console.log('[TX] state →', s);
    set({ state: s });
  },
  setSignature: (sig) => set({ signature: sig }),
  setError: (e) => set({ error: e }),
  setCampaignId: (id) => set({ campaignId: id }),
  reset: () => {
    console.log('[TX] state → idle (reset)');
    set({ state: 'idle', signature: null, error: null, campaignId: null });
  },
}));

export const CLUSTER: 'devnet' | 'mainnet-beta' = 'devnet';
export const explorerUrl = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;
