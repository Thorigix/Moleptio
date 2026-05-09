import { useCampaignStore } from '@/services/campaigns/store';
import { Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import * as Linking from 'expo-linking';
import nacl from 'tweetnacl';
import { connection } from '../solana/connection';
import { useTxStore } from '../tx/state';
import {
  decodeBs58,
  decryptPayload,
  encodeBs58,
  encryptPayload,
  newDappKeyPair,
  sharedSecret,
} from './crypto';
import {
  clearDappKeyPair,
  clearSession,
  loadDappKeyPair,
  loadSession,
  saveDappKeyPair,
  saveSession,
} from './storage';
import { useWalletStore } from './store';

const PHANTOM_BASE = 'https://phantom.app/ul/v1';
const APP_URL = 'https://moleptio.app';
const CLUSTER: 'devnet' | 'mainnet-beta' = 'devnet';

const explorerUrl = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;

// Module-scoped state.
// `dappKeyPair` and the session are also persisted to AsyncStorage so they
// survive the app being backgrounded (or even killed) during the Phantom
// deeplink round-trip. `hydratePromise` ensures any deeplink handler waits
// for the restore to finish before reading state.
let dappKeyPair: nacl.BoxKeyPair | null = null;
let pendingSign: {
  resolve: (signature: string) => void;
  reject: (e: Error) => void;
} | null = null;
let lastHandledSignKey: string | null = null;
const inFlightSignatures = new Set<string>();
const completedSignatures = new Set<string>();
let hydratePromise: Promise<void> | null = null;

async function hydrate(): Promise<void> {
  const [kp, session] = await Promise.all([loadDappKeyPair(), loadSession()]);
  if (kp) dappKeyPair = kp;
  if (session && !useWalletStore.getState().session) {
    useWalletStore.getState().setSession(session);
  }
}

function ensureHydrated(): Promise<void> {
  if (!hydratePromise) hydratePromise = hydrate();
  return hydratePromise;
}

type QueryParamValue = string | string[] | undefined;
type QueryParamMap = Record<string, QueryParamValue>;
type NormalizedQueryParams = Record<string, string | undefined>;

function normalizeQueryParams(qp: QueryParamMap): NormalizedQueryParams {
  const out: NormalizedQueryParams = {};
  for (const [k, v] of Object.entries(qp)) {
    if (typeof v === 'string') out[k] = v;
    else if (Array.isArray(v)) out[k] = v[0];
    else out[k] = undefined;
  }
  return out;
}

const redirect = (path: string) => Linking.createURL(path);

// ── Connect ────────────────────────────────────────────────────────────────
export async function connect() {
  useWalletStore.getState().setConnecting(true);
  try {
    dappKeyPair = newDappKeyPair();
    // Persist BEFORE opening Phantom — Android may kill our process during the
    // deeplink round-trip, so the keypair must already be on disk by then.
    await saveDappKeyPair(dappKeyPair);

    // Standalone builds can be killed very quickly when switching apps.
    // Read back immediately to ensure the keypair is actually persisted.
    const persisted = await loadDappKeyPair();
    if (!persisted) {
      throw new Error('Failed to persist dapp keypair. Please try again.');
    }
    dappKeyPair = persisted;

    const params = new URLSearchParams({
      dapp_encryption_public_key: encodeBs58(dappKeyPair.publicKey),
      cluster: CLUSTER,
      app_url: APP_URL,
      redirect_link: redirect('phantom/connect'),
    });

    await Linking.openURL(`${PHANTOM_BASE}/connect?${params.toString()}`);
  } catch (e) {
    useWalletStore.getState().setConnecting(false);
    throw e;
  }
}

// ── Disconnect ─────────────────────────────────────────────────────────────
// Minimal: clears local session. Phantom will treat the session as stale on
// its side. Wire the full `/disconnect` deeplink later if needed.
export function disconnect() {
  useWalletStore.getState().setSession(null);
  useWalletStore.getState().setLastSignature(null);
  useWalletStore.getState().setSigning(false);
  dappKeyPair = null;
  // Fire-and-forget — no need to block UI on storage clear.
  Promise.all([clearDappKeyPair(), clearSession()]).catch(() => { });
}

// ── Sign + send transaction (structure only) ───────────────────────────────
// Caller produces the base58-encoded serialized Solana transaction. Once the
// escrow contract is wired in a later task, this stays unchanged — only the
// caller side needs to build the Transaction object.
//
// `campaignId` is encoded in the redirect URL so it survives an Android
// process kill during the Phantom round-trip. handleSignCallback reads it
// back from the deep-link params and writes the join to the campaign store
// before resolving the Promise, making persistence independent of component
// lifecycle.
export function signAndSendTransaction(
  transactionBase58: string,
  campaignId?: string,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const session = useWalletStore.getState().session;
    if (!session) return reject(new Error('Wallet not connected'));
    if (!dappKeyPair) return reject(new Error('Dapp keypair missing — reconnect wallet'));

    pendingSign = { resolve, reject };
    useWalletStore.getState().setSigning(true);
    useWalletStore.getState().setLastSignature(null);

    const { data, nonce } = encryptPayload(
      { session: session.session, transaction: transactionBase58 },
      session.sharedSecret,
    );

    // Embed campaignId in the redirect URL so it comes back in the deep-link
    // params even if Android killed the process and pendingSign is gone.
    const redirectBase = redirect('phantom/sign');
    const redirectLink = campaignId
      ? `${redirectBase}?campaignId=${encodeURIComponent(campaignId)}`
      : redirectBase;

    const params = new URLSearchParams({
      dapp_encryption_public_key: encodeBs58(dappKeyPair.publicKey),
      nonce,
      payload: data,
      redirect_link: redirectLink,
    });

    try {
      // Phantom mobile reliably implements `signTransaction` over deeplinks.
      // `signAndSendTransaction` returns -32601 on most builds, so we sign
      // here and broadcast ourselves in handleSignCallback.
      console.log('[PHANTOM] request sent');
      useTxStore.getState().setState('awaiting_phantom');
      await Linking.openURL(`${PHANTOM_BASE}/signTransaction?${params.toString()}`);
    } catch (e) {
      pendingSign = null;
      useWalletStore.getState().setSigning(false);
      reject(e as Error);
    }
  });
}

// ── Deeplink listener registration (call once at app root) ─────────────────
export function initDeepLinkListener() {
  // Kick off hydration immediately so it races with — and almost always
  // beats — the incoming Phantom redirect.
  ensureHydrated();
  const sub = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink(url);
  });
  return () => sub.remove();
}

// Exposed for route-level fallbacks: Expo Router can consume the initial URL
// before Linking.getInitialURL() sees it. These helpers let callback screens
// process the query params directly.
export async function ensureWalletHydrated() {
  await ensureHydrated();
}

export async function handlePhantomConnectCallbackParams(qp: QueryParamMap) {
  await ensureHydrated();
  await handleConnectCallback(normalizeQueryParams(qp));
}

export async function handlePhantomSignCallbackParams(qp: QueryParamMap) {
  await ensureHydrated();
  await handleSignCallback(normalizeQueryParams(qp));
}

// ── Deeplink callback handler ──────────────────────────────────────────────
export async function handleDeepLink(url: string) {
  // Always wait for AsyncStorage restore before reading dappKeyPair / session.
  // This is the key fix: the URL event can arrive before in-memory state has
  // been rehydrated after the app was backgrounded by Phantom.
  await ensureHydrated();

  const parsed = Linking.parse(url);
  const path = parsed.path ?? '';
  const qp = normalizeQueryParams((parsed.queryParams ?? {}) as QueryParamMap);

  if (qp.errorCode) {
    useWalletStore.getState().setConnecting(false);
    pendingSign?.reject(new Error(qp.errorMessage ?? `Phantom error ${qp.errorCode}`));
    pendingSign = null;
    return;
  }

  try {
    if (path.endsWith('phantom/connect')) await handleConnectCallback(qp);
    else if (path.endsWith('phantom/sign')) await handleSignCallback(qp);
    else {
      // Fallback: some environments produce odd paths; if required params exist,
      // still attempt to handle.
      if (qp.phantom_encryption_public_key && qp.data && qp.nonce) {
        await handleConnectCallback(qp);
      } else if (qp.data && qp.nonce) {
        await handleSignCallback(qp);
      }
    }
  } catch (e: any) {
    console.warn('[Phantom] deeplink handling failed:', e);
    useWalletStore.getState().setConnecting(false);
    pendingSign?.reject(e as Error);
    pendingSign = null;
  }
}

async function handleConnectCallback(qp: Record<string, string | undefined>) {
  if (!dappKeyPair) {
    // One last attempt: load from storage. This covers cases where the URL was
    // handled before module state was initialized.
    dappKeyPair = await loadDappKeyPair();
  }
  if (!dappKeyPair) {
    throw new Error('Missing dapp keypair — reconnect wallet and try again');
  }
  const { phantom_encryption_public_key, data, nonce } = qp;
  if (!phantom_encryption_public_key || !data || !nonce) {
    throw new Error('Phantom connect callback missing required parameters');
  }

  const shared = sharedSecret(decodeBs58(phantom_encryption_public_key), dappKeyPair.secretKey);
  const decoded = decryptPayload<{ public_key: string; session: string }>(data, nonce, shared);

  console.log('[Phantom] ✓ Wallet connected:', decoded.public_key);

  const session = {
    publicKey: decoded.public_key,
    session: decoded.session,
    sharedSecret: shared,
  };
  useWalletStore.getState().setSession(session);
  useWalletStore.getState().setConnecting(false);
  // Persist so signing can survive a future background event too.
  saveSession(session).catch(() => { });
}

const CONFIRM_TIMEOUT_MS = 20_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function signatureFromSignedTxBytes(bytes: Uint8Array): string | null {
  try {
    const tx = Transaction.from(bytes);
    const sig = tx.signatures?.[0]?.signature;
    if (!sig) return null;
    return bs58.encode(sig);
  } catch {
    return null;
  }
}

function isAlreadyProcessedError(e: any): boolean {
  const msg = String(e?.message ?? '');
  return msg.includes('already been processed') || msg.includes('already processed');
}

async function handleSignCallback(qp: Record<string, string | undefined>) {
  const session = useWalletStore.getState().session;
  if (!session) return;
  const { data, nonce } = qp;
  if (!data || !nonce) return;

  let extractedSignature: string | null = null;

  const key = `${nonce}:${data.slice(0, 24)}`;
  if (lastHandledSignKey === key) return;
  lastHandledSignKey = key;

  // Drives a guaranteed final transition for the UI state machine even when
  // there's no pendingSign promise to resolve (e.g. the originating screen
  // was unmounted before the Phantom round-trip returned).
  const fail = (msg: string) => {
    useTxStore.getState().setError(msg);
    useTxStore.getState().setState('error');
    pendingSign?.reject(new Error(msg));
  };

  try {
    // Phantom returns the SIGNED transaction (base58), not a signature.
    const decoded = decryptPayload<{ transaction: string }>(data, nonce, session.sharedSecret);
    const signedTxBytes = bs58.decode(decoded.transaction);

    extractedSignature = signatureFromSignedTxBytes(signedTxBytes);
    if (extractedSignature) {
      const lastSig = useWalletStore.getState().lastSignature;
      const txSig = useTxStore.getState().signature;

      if (
        completedSignatures.has(extractedSignature) ||
        lastSig === extractedSignature ||
        txSig === extractedSignature
      ) {
        console.log('[Solana] duplicate sign callback ignored (already handled)');
        return;
      }
      if (inFlightSignatures.has(extractedSignature)) {
        console.log('[Solana] duplicate sign callback ignored (in-flight)');
        return;
      }
      inFlightSignatures.add(extractedSignature);
    }

    // Broadcast via our own devnet RPC. Phantom did the signing only.
    let signature: string;
    try {
      signature = await connection.sendRawTransaction(signedTxBytes);
    } catch (e: any) {
      // If another handler already broadcasted this exact signed tx, treat the
      // duplicate send as success and continue confirming.
      if (extractedSignature && isAlreadyProcessedError(e)) {
        signature = extractedSignature;
      } else {
        throw e;
      }
    }
    console.log('[Solana] SIGNATURE RECEIVED:', signature);
    console.log('[Solana] explorer:', explorerUrl(signature));
    console.log('[CONFIRM] waiting…');
    useTxStore.getState().setState('confirming');

    // Hold UI updates until confirmation lands. Bound the wait so a hung
    // RPC can never strand the UI in `confirming`.
    const result = await withTimeout(
      connection.confirmTransaction(signature, 'confirmed'),
      CONFIRM_TIMEOUT_MS,
      'Confirmation',
    );

    if (result.value.err) {
      console.warn('[CONFIRM] fail', result.value.err);
      fail(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
      return;
    }

    // Persist the join state here — before any UI update — so it survives
    // an Android process kill. If pendingSign.resolve later wakes runJoin,
    // the store's own guard (joinedIds[id] check) makes the second call
    // a safe no-op.
    const campaignId = qp.campaignId;
    if (campaignId) {
      console.log('[CONFIRM] persisting join →', campaignId);
      useCampaignStore.getState().join(campaignId);
      useCampaignStore.getState().recordTx(campaignId, signature);
    }

    console.log('[CONFIRM] success', signature);
    useWalletStore.getState().setLastSignature(signature);
    useTxStore.getState().setSignature(signature);
    useTxStore.getState().setState('success');
    pendingSign?.resolve(signature);

    completedSignatures.add(signature);
  } catch (e: any) {
    console.warn('[Solana] FAILED — sign/confirm error:', e);
    fail(e?.message ?? 'Unknown sign/confirm error');
  } finally {
    useWalletStore.getState().setSigning(false);
    pendingSign = null;

    if (extractedSignature) inFlightSignatures.delete(extractedSignature);
  }
}
