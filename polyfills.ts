// Polyfills for Expo Go (no native modules). Imported as the FIRST line of
// app/_layout.tsx so these globals exist before @solana/web3.js is loaded.
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';

const g = globalThis as any;

// Buffer — @solana/web3.js relies on it for serialization.
if (typeof g.Buffer === 'undefined') {
  g.Buffer = Buffer;
}

// crypto.getRandomValues — @solana/web3.js calls this during transaction
// building. react-native-get-random-values is a native module and does NOT
// work in Expo Go, so we shim it with expo-crypto's pure-JS getRandomBytes.
if (!g.crypto) g.crypto = {};
if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = <T extends ArrayBufferView>(arr: T): T => {
    const bytes = Crypto.getRandomBytes(arr.byteLength);
    new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength).set(bytes);
    return arr;
  };
}
