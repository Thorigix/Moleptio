import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

// tweetnacl needs a PRNG. Expo Go has no native crypto.getRandomValues,
// so wire expo-crypto's pure-JS getRandomBytes into nacl.setPRNG once at load.
nacl.setPRNG((x, n) => {
  const bytes = Crypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) x[i] = bytes[i];
});

export type DappKeyPair = nacl.BoxKeyPair;

export const newDappKeyPair = (): DappKeyPair => nacl.box.keyPair();

export const encodeBs58 = (b: Uint8Array) => bs58.encode(b);
export const decodeBs58 = (s: string) => bs58.decode(s);

export const sharedSecret = (theirPub: Uint8Array, oursSecret: Uint8Array) =>
  nacl.box.before(theirPub, oursSecret);

export function decryptPayload<T = any>(
  data: string,
  nonce: string,
  shared: Uint8Array,
): T {
  const decrypted = nacl.box.open.after(
    bs58.decode(data),
    bs58.decode(nonce),
    shared,
  );
  if (!decrypted) throw new Error('Failed to decrypt Phantom payload');
  return JSON.parse(Buffer.from(decrypted).toString('utf8')) as T;
}

export function encryptPayload(
  payload: object,
  shared: Uint8Array,
): { data: string; nonce: string } {
  const nonce = nacl.randomBytes(24);
  const message = Uint8Array.from(Buffer.from(JSON.stringify(payload), 'utf8'));
  const encrypted = nacl.box.after(message, nonce, shared);
  return { data: bs58.encode(encrypted), nonce: bs58.encode(nonce) };
}
