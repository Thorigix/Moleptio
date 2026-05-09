import { Connection, clusterApiUrl } from '@solana/web3.js';

// Devnet RPC. Override via EXPO_PUBLIC_SOLANA_RPC in .env or app.json extra.
const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC ?? clusterApiUrl('devnet');

// Single shared Connection instance. Only HTTP methods are used (no
// WebSocket subscriptions), which keeps this Expo Go-safe.
export const connection = new Connection(RPC_URL, 'confirmed');
