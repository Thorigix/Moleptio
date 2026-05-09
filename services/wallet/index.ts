import * as Linking from 'expo-linking';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {
  newDappKeyPair,
  encodeBs58,
  decodeBs58,
  sharedSecret,
  decryptPayload,
  encryptPayload,
} from './crypto';
import { connection } from '../solana/connection';
import { useCampaignStore } from '@/services/campaigns/store';
import { useTxStore } from '../tx/state';
import { useWalletStore } from './store';
import {
  saveDappKeyPair,
  loadDappKeyPair,
  clearDappKeyPair,
  saveSession,
  loadSession,
  clearSession,
} from './storage';

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

const redirect = (path: string) => Linking.createURL(path);

// ── Connect ────────────────────────────────────────────────────────────────
export async function connect() {
  dappKeyPair = newDappKeyPair();
  // Persist BEFORE opening Phantom — Android may kill our process during the
  // deeplink round-trip, so the keypair must already be on disk by then.
  await saveDappKeyPair(dappKeyPair);

  const params = new URLSearchParams({
    dapp_encryption_public_key: encodeBs58(dappKeyPair.publicKey),
    cluster: CLUSTER,
    app_url: APP_URL,
    redirect_link: redirect('phantom/connect'),
  });

  useWalletStore.getState().setConnecting(true);
  await Linking.openURL(`${PHANTOM_BASE}/connect?${params.toString()}`);
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
  Promise.all([clearDappKeyPair(), clearSession()]).catch(() => {});
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

// ── Deeplink callback handler ──────────────────────────────────────────────
export async function handleDeepLink(url: string) {
  // Always wait for AsyncStorage restore before reading dappKeyPair / session.
  // This is the key fix: the URL event can arrive before in-memory state has
  // been rehydrated after the app was backgrounded by Phantom.
  await ensureHydrated();

  const parsed = Linking.parse(url);
  const path = parsed.path ?? '';
  const qp = (parsed.queryParams ?? {}) as Record<string, string | undefined>;

  if (qp.errorCode) {
    useWalletStore.getState().setConnecting(false);
    pendingSign?.reject(new Error(qp.errorMessage ?? `Phantom error ${qp.errorCode}`));
    pendingSign = null;
    return;
  }

  if (path.endsWith('phantom/connect')) handleConnectCallback(qp);
  else if (path.endsWith('phantom/sign')) handleSignCallback(qp);
}

function handleConnectCallback(qp: Record<string, string | undefined>) {
  if (!dappKeyPair) {
    console.warn('[Phantom] connect callback received but no dapp keypair in memory or storage');
    return;
  }
  const { phantom_encryption_public_key, data, nonce } = qp;
  if (!phantom_encryption_public_key || !data || !nonce) {
    console.warn('[Phantom] connect callback missing required params', qp);
    return;
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
  saveSession(session).catch(() => {});
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

async function handleSignCallback(qp: Record<string, string | undefined>) {
  const session = useWalletStore.getState().session;
  if (!session) return;
  const { data, nonce } = qp;
  if (!data || !nonce) return;

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

    // Broadcast via our own devnet RPC. Phantom did the signing only.
    const signature = await connection.sendRawTransaction(signedTxBytes);
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
  } catch (e: any) {
    console.warn('[Solana] FAILED — sign/confirm error:', e);
    fail(e?.message ?? 'Unknown sign/confirm error');
  } finally {
    useWalletStore.getState().setSigning(false);
    pendingSign = null;
  }
}
