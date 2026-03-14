export const ASSETS = {
  USDT_TRC20: {
    symbol: 'USDT',
    name: 'Tether USD',
    network: 'TRC-20 (Tron)',
    chain: 'TRON',
    type: 'stablecoin' as const,
    maxLtv: 0.80,
    marginCallLtv: 0.85,
    liquidationLtv: 0.90,
    confirmationsRequired: 20,
    color: '#26A17B',
    priority: 1,
  },
  USDT_ERC20: {
    symbol: 'USDT',
    name: 'Tether USD',
    network: 'ERC-20 (Ethereum)',
    chain: 'ETHEREUM',
    type: 'stablecoin' as const,
    maxLtv: 0.80,
    marginCallLtv: 0.85,
    liquidationLtv: 0.90,
    confirmationsRequired: 12,
    color: '#26A17B',
    priority: 2,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    network: 'ERC-20 (Ethereum)',
    chain: 'ETHEREUM',
    type: 'stablecoin' as const,
    maxLtv: 0.80,
    marginCallLtv: 0.85,
    liquidationLtv: 0.90,
    confirmationsRequired: 12,
    color: '#2775CA',
    priority: 3,
  },
  cNGN: {
    symbol: 'cNGN',
    name: 'cNGN (Naira Stablecoin)',
    network: 'ERC-20 (Ethereum)',
    chain: 'ETHEREUM',
    type: 'ngn_stablecoin' as const,
    maxLtv: 1.00,
    marginCallLtv: null,
    liquidationLtv: null,
    confirmationsRequired: 12,
    color: '#00B386',
    priority: 4,
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'Bitcoin',
    chain: 'BITCOIN',
    type: 'volatile' as const,
    maxLtv: 0.70,
    marginCallLtv: 0.75,
    liquidationLtv: 0.82,
    confirmationsRequired: 6,
    color: '#F7931A',
    priority: 5,
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'ERC-20 (Ethereum)',
    chain: 'ETHEREUM',
    type: 'volatile' as const,
    maxLtv: 0.60,
    marginCallLtv: 0.70,
    liquidationLtv: 0.78,
    confirmationsRequired: 12,
    color: '#627EEA',
    priority: 6,
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    network: 'Solana',
    chain: 'SOLANA',
    type: 'volatile' as const,
    maxLtv: 0.60,
    marginCallLtv: 0.68,
    liquidationLtv: 0.76,
    confirmationsRequired: 32,
    color: '#9945FF',
    priority: 7,
  },
  XRP: {
    symbol: 'XRP',
    name: 'XRP',
    network: 'XRP Ledger',
    chain: 'XRPL',
    type: 'volatile' as const,
    maxLtv: 0.60,
    marginCallLtv: 0.68,
    liquidationLtv: 0.76,
    confirmationsRequired: 1,
    color: '#00AAE4',
    priority: 8,
  },
  BNB: {
    symbol: 'BNB',
    name: 'BNB',
    network: 'BSC (BEP-20)',
    chain: 'BSC',
    type: 'volatile' as const,
    maxLtv: 0.60,
    marginCallLtv: 0.68,
    liquidationLtv: 0.76,
    confirmationsRequired: 15,
    color: '#F0B90B',
    priority: 9,
  },
} as const;

export type AssetKey = keyof typeof ASSETS;
export type Asset = typeof ASSETS[AssetKey];

export function adjustedMarginCallLtv(baseLtv: number, vol24h: number): number {
  if (vol24h <= 5) return baseLtv;
  const adjustment = Math.min((vol24h - 5) * 0.005, 0.05);
  return baseLtv - adjustment;
}

export function calculateLtv(outstanding: number, collateralAmount: number, priceNgn: number): number {
  const value = collateralAmount * priceNgn;
  return value > 0 ? outstanding / value : 0;
}

export function contractModel(principalNgn: number): 'single_key' | 'mpc' {
  return principalNgn >= 50_000_000 ? 'mpc' : 'single_key';
}

export function getAssetsSorted() {
  return Object.entries(ASSETS)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([key, asset]) => ({ key: key as AssetKey, ...asset }));
}

export function getAssetBySymbolAndChain(symbol: string, chain?: string) {
  return Object.entries(ASSETS).find(([, a]) => 
    a.symbol === symbol && (!chain || a.chain === chain)
  );
}
