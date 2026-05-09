import {
  connect,
  disconnect,
  signAndSendTransaction,
} from '@/services/wallet';
import { useWalletStore } from '@/services/wallet/store';

export function useWallet() {
  const session = useWalletStore((s) => s.session);
  const connecting = useWalletStore((s) => s.connecting);

  return {
    session,
    connecting,
    connected: !!session,
    publicKey: session?.publicKey ?? null,
    connect,
    disconnect,
    signAndSendTransaction,
  };
}
