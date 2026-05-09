import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

import { connection } from './connection';

// Builds an unsigned self-transfer for `priceSol` on devnet, serialized and
// base58-encoded — the shape Phantom's signTransaction deeplink expects.
// Self-transfer is the placeholder until the escrow program lands; the amount
// must still match the campaign price exactly so the demo is honest about
// what the user is actually signing.
export async function buildSelfTransferTx(
  walletAddress: string,
  priceSol: number,
): Promise<string> {
  if (!Number.isFinite(priceSol) || priceSol <= 0) {
    throw new Error(`Invalid campaign price: ${priceSol}`);
  }
  const owner = new PublicKey(walletAddress);
  const lamports = Math.round(priceSol * LAMPORTS_PER_SOL);
  console.log(`[AMOUNT] UI_SOL=${priceSol} → TX_LAMPORTS=${lamports}`);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: owner,
      lamports,
    }),
  );

  tx.feePayer = owner;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return bs58.encode(serialized);
}
