import { create } from 'zustand';

export type Session = {
  publicKey: string;        // user's Solana wallet (base58)
  session: string;          // opaque Phantom session token
  sharedSecret: Uint8Array; // shared secret used to en/decrypt future Phantom payloads
};

type State = {
  session: Session | null;
  connecting: boolean;
  signing: boolean;
  lastSignature: string | null;
  setSession: (s: Session | null) => void;
  setConnecting: (c: boolean) => void;
  setSigning: (s: boolean) => void;
  setLastSignature: (s: string | null) => void;
};

export const useWalletStore = create<State>((set) => ({
  session: null,
  connecting: false,
  signing: false,
  lastSignature: null,
  setSession: (session) => set({ session }),
  setConnecting: (connecting) => set({ connecting }),
  setSigning: (signing) => set({ signing }),
  setLastSignature: (lastSignature) => set({ lastSignature }),
}));
