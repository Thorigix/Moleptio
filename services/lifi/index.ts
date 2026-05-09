// LI.FI cross-chain routing — REST only (no SDK) so Expo Go stays clean.
// We use this service for FUNDING / BRIDGING liquidity into the user's
// Solana wallet. It is NOT used for campaign join/escrow logic — those
// stay on the existing Phantom + Solana devnet path.

const LIFI_API = 'https://li.quest/v1';

export type SupportedChainKey =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base';

export type ChainOption = {
  key: SupportedChainKey;
  label: string;
  chainId: number;
  usdc: string; // USDC token address on that chain
  short: string;
};

export const SOURCE_CHAINS: ChainOption[] = [
  {
    key: 'ethereum',
    label: 'Ethereum',
    chainId: 1,
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    short: 'ETH',
  },
  {
    key: 'polygon',
    label: 'Polygon',
    chainId: 137,
    usdc: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    short: 'POL',
  },
  {
    key: 'arbitrum',
    label: 'Arbitrum',
    chainId: 42161,
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    short: 'ARB',
  },
  {
    key: 'optimism',
    label: 'Optimism',
    chainId: 10,
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    short: 'OPT',
  },
  {
    key: 'base',
    label: 'Base',
    chainId: 8453,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    short: 'BASE',
  },
];

// LI.FI's chain id for Solana
export const SOLANA_CHAIN_ID = 1151111081099710;
// USDC mint on Solana mainnet (LI.FI quotes against mainnet USDC)
export const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_DECIMALS = 6;

export type LifiStep = {
  tool: string;
  toolName?: string;
  estimate?: {
    executionDuration?: number;
    fromAmount?: string;
    toAmount?: string;
    feeCosts?: { name?: string; amountUSD?: string }[];
  };
};

export type LifiRoute = {
  id: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  gasCostUSD?: string;
  steps: LifiStep[];
  // Convenience fields we derive locally:
  toAmountFormatted: string;
  durationSec: number;
  toolNames: string[];
};

export type GetRoutesArgs = {
  fromChain: ChainOption;
  toAmountUsdc: number; // amount in USDC (human number)
  toAddress?: string;
};

function toBaseUnits(human: number, decimals: number) {
  // Avoid floating-point drift: split into int/frac and concat as string.
  const fixed = human.toFixed(decimals);
  const [whole, frac = ''] = fixed.split('.');
  return `${whole}${frac.padEnd(decimals, '0')}`.replace(/^0+(?=\d)/, '') || '0';
}

function fromBaseUnits(raw: string, decimals: number) {
  if (!raw) return '0';
  const padded = raw.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals);
  const frac = padded.slice(-decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

export async function getRoutes({
  fromChain,
  toAmountUsdc,
  toAddress,
}: GetRoutesArgs): Promise<LifiRoute[]> {
  const fromAmount = toBaseUnits(toAmountUsdc, USDC_DECIMALS);
  const body = {
    fromChainId: fromChain.chainId,
    fromTokenAddress: fromChain.usdc,
    fromAmount,
    toChainId: SOLANA_CHAIN_ID,
    toTokenAddress: SOLANA_USDC,
    ...(toAddress ? { toAddress } : {}),
    options: { order: 'RECOMMENDED', slippage: 0.005 },
  };

  const res = await fetch(`${LIFI_API}/advanced/routes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LI.FI routes failed (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  const routes: any[] = data?.routes ?? [];
  return routes.slice(0, 5).map((r) => normalizeRoute(r));
}

function normalizeRoute(r: any): LifiRoute {
  const steps: LifiStep[] = r?.steps ?? [];
  const durationSec = steps.reduce(
    (acc, s) => acc + (s?.estimate?.executionDuration ?? 0),
    0,
  );
  const toolNames = Array.from(
    new Set(
      steps
        .map((s) => s.toolName || s.tool)
        .filter((s): s is string => typeof s === 'string'),
    ),
  );
  return {
    id: r.id,
    fromAmount: r.fromAmount,
    toAmount: r.toAmount,
    toAmountMin: r.toAmountMin ?? r.toAmount,
    gasCostUSD: r.gasCostUSD,
    steps,
    toAmountFormatted: fromBaseUnits(String(r.toAmount ?? '0'), USDC_DECIMALS),
    durationSec,
    toolNames,
  };
}

// Execute the chosen route. Real execution requires an EVM signer, which
// Expo Go does not host (Phantom is Solana-only here). We return a logical
// receipt that the bridge store records — the route quote itself is real
// LI.FI data, the on-chain settlement is left to the user's EVM wallet
// of choice and re-confirmed when funds land in their Solana account.
export type ExecuteReceipt = {
  routeId: string;
  receivedUsdc: string;
  fromChain: SupportedChainKey;
  toolNames: string[];
  startedAt: number;
};

export async function executeRoute(
  route: LifiRoute,
  fromChain: ChainOption,
): Promise<ExecuteReceipt> {
  // Small simulated wait so the UI has a real "executing" beat.
  await new Promise((r) => setTimeout(r, 1400));
  return {
    routeId: route.id,
    receivedUsdc: route.toAmountFormatted,
    fromChain: fromChain.key,
    toolNames: route.toolNames,
    startedAt: Date.now(),
  };
}
