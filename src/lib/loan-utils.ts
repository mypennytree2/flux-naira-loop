import { COLLATERAL_ASSETS, type CollateralAssetKey } from './collateral-assets';

// ─── Interest ──────────────────────────────────────────
export const DAILY_RATE = 0.0015;

export function daysBetween(start: Date | string, end: Date | string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, (e - s) / 86400000);
}

export function calculateInterest(principalNGN: number, daysElapsed: number): number {
  return principalNGN * DAILY_RATE * daysElapsed;
}

export function getTotalOutstanding(outstandingPrincipal: number, createdAt: string | Date): number {
  const days = daysBetween(createdAt, new Date());
  const interest = calculateInterest(outstandingPrincipal, days);
  return outstandingPrincipal + interest;
}

// ─── LTV ───────────────────────────────────────────────
export interface LTVResult {
  currentLTV: number;
  currentCollateralValueNGN: number;
  effectiveMarginCallLTV: number;
  effectiveLiquidationLTV: number;
  isHighVolatility: boolean;
  volAdjustment: number;
  status: 'healthy' | 'caution' | 'margin_call' | 'liquidation_zone';
}

const HIGH_VOL_THRESHOLD = 5;

export function calculateLTV(
  outstandingNGN: number,
  collateralAsset: string,
  collateralAmount: number,
  currentPriceNGN: number,
  volatility24h: number
): LTVResult {
  const asset = COLLATERAL_ASSETS[collateralAsset as CollateralAssetKey];
  const currentCollateralValueNGN = collateralAmount * currentPriceNGN;
  const currentLTV = currentCollateralValueNGN > 0
    ? (outstandingNGN / currentCollateralValueNGN) * 100
    : 0;

  const isHighVolatility = !asset.isStable && volatility24h > HIGH_VOL_THRESHOLD;
  const volAdjustment = isHighVolatility
    ? Math.min((volatility24h - HIGH_VOL_THRESHOLD) * 0.5, 5)
    : 0;

  const effectiveMarginCallLTV = asset.marginCallLTV - volAdjustment;
  const effectiveLiquidationLTV = asset.liquidationLTV - volAdjustment;

  return {
    currentLTV: Math.round(currentLTV * 100) / 100,
    currentCollateralValueNGN,
    effectiveMarginCallLTV,
    effectiveLiquidationLTV,
    isHighVolatility,
    volAdjustment,
    status:
      currentLTV >= effectiveLiquidationLTV ? 'liquidation_zone' :
      currentLTV >= effectiveMarginCallLTV  ? 'margin_call' :
      currentLTV >= asset.maxLTV * 0.85     ? 'caution' : 'healthy',
  };
}

// ─── Approval ──────────────────────────────────────────
export interface ApprovalDecision {
  type: 'instant' | 'manual';
  message: string;
  estimatedMinutes: number;
}

const TEN_MILLION = 10_000_000;

export function determineApprovalType(loanAmountNGN: number, kycTier: number): ApprovalDecision {
  if (kycTier >= 1 && loanAmountNGN <= TEN_MILLION) {
    return {
      type: 'instant',
      message: 'Your loan is being processed instantly.',
      estimatedMinutes: 0,
    };
  }
  return {
    type: 'manual',
    message: "Your loan is under review. You'll be notified within 30–60 minutes.",
    estimatedMinutes: 30,
  };
}

// ─── Origination Fee ───────────────────────────────────
export const ORIGINATION_FEE_RATE = 0.01;

export function calculateLoanTerms(collateralValueNGN: number, maxLTV: number, requestedLTV: number) {
  const ltvToUse = Math.min(requestedLTV, maxLTV);
  const grossLoan = collateralValueNGN * (ltvToUse / 100);
  const originationFee = grossLoan * ORIGINATION_FEE_RATE;
  const netDisbursed = grossLoan - originationFee;
  return { grossLoan, originationFee, netDisbursed, ltvToUse };
}

// ─── Currency Formatting ───────────────────────────────
export function formatNaira(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatCurrency(amount: number, decimals = 2): string {
  return amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export function parseCurrencyInput(value: string): number {
  return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
}
