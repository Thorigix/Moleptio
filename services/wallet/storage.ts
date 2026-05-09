import AsyncStorage from '@react-native-async-storage/async-storage';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

import { Session } from './store';

const DAPP_KEY = '@moleptio/wallet/dapp';
const SESSION_KEY = '@moleptio/wallet/session';

type StoredDapp = { publicKey: string; secretKey: string };
type StoredSession = { publicKey: string; session: string; sharedSecret: string };

export async function saveDappKeyPair(kp: nacl.BoxKeyPair): Promise<void> {
  const v: StoredDapp = {
    publicKey: bs58.encode(kp.publicKey),
    secretKey: bs58.encode(kp.secretKey),
  };
  await AsyncStorage.setItem(DAPP_KEY, JSON.stringify(v));
}

export async function loadDappKeyPair(): Promise<nacl.BoxKeyPair | null> {
  const raw = await AsyncStorage.getItem(DAPP_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as StoredDapp;
    return { publicKey: bs58.decode(v.publicKey), secretKey: bs58.decode(v.secretKey) };
  } catch {
    return null;
  }
}

export async function clearDappKeyPair(): Promise<void> {
  await AsyncStorage.removeItem(DAPP_KEY);
}

export async function saveSession(s: Session): Promise<void> {
  const v: StoredSession = {
    publicKey: s.publicKey,
    session: s.session,
    sharedSecret: bs58.encode(s.sharedSecret),
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(v));
}

export async function loadSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as StoredSession;
    return {
      publicKey: v.publicKey,
      session: v.session,
      sharedSecret: bs58.decode(v.sharedSecret),
    };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
