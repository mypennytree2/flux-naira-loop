import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import LtvBar from '@/components/flux/LtvBar';
import MpcBadge from '@/components/flux/MpcBadge';
import { ASSETS, calculateLtv, adjustedMarginCallLtv } from '@/config/assets';
import { formatNaira, getTotalOutstanding, calculateInterest, daysBetween, DAILY_RATE } from '@/lib/loan-utils';
import { AlertTriangle, ExternalLink, ArrowLeft, TrendingUp, TrendingDown, Zap, Wallet as WalletIcon, Shield, Download, Unlock, Bell, XCircle, CheckCircle } from 'lucide-react';

const EVENT_ICONS: Record<string, { icon: any; color: string }> = {
  deposit_received: { icon: Download, color: 'text-info' },
  oracle_signed: { icon: Shield, color: 'text-purple' },
  loan_activated: { icon: Zap, color: 'text-primary' },
  disbursed: { icon: WalletIcon, color: 'text-primary' },
  margin_call_sent: { icon: Bell, color: 'text-warning' },
  yield_deployed: { icon: TrendingUp, color: 'text-primary' },
  yield_recalled: { icon: TrendingDown, color: 'text-primary' },
  repayment_received: { icon: CheckCircle, color: 'text-primary' },
  collateral_released: { icon: Unlock, color: 'text-primary' },
  liquidation_started: { icon: XCircle, color: 'text-destructive' },
  liquidation_completed: { icon: XCircle, color: 'text-destructive' },
};

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [repayAmount, setRepayAmount] = useState('');
  const [repaying, setRepaying] = useState(false);
  const [liveOutstanding, setLiveOutstanding] = useState(0);

  const { data: loan, refetch: refetchLoan } = useQuery({
    queryKey: ['loan', id],
    queryFn: async () => {
      const { data } = await supabase.from('loans').select('*').eq('id', id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: deposit } = useQuery({
    queryKey: ['deposit', loan?.collateral_deposit_id],
    queryFn: async () => {
      const { data } = await supabase.from('collateral_deposits').select('*').eq('id', loan!.collateral_deposit_id!).single();
      return data;
    },
    enabled: !!loan?.collateral_deposit_id,
  });

  const { data: prices } = useQuery({
    queryKey: ['prices'],
    queryFn: async () => {
      const { data } = await supabase.from('price_feed').select('*');
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('wallets').select('*').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!loan) return;
    const update = () => setLiveOutstanding(getTotalOutstanding(Number(loan.outstanding_principal_ngn), loan.created_at!));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [loan]);

  if (!loan) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flux-skeleton h-8 w-8 rounded-full" />
        </div>
      </AppLayout>
    );
  }

  const assetConfig = Object.values(ASSETS).find(a => a.symbol === loan.collateral_asset);
  const price = prices?.find(p => p.asset === loan.collateral_asset);
  const priceNGN = Number(price?.price_ngn || 0);
  const vol24h = Number(price?.volatility_24h_pct || 0);

  const ltv = priceNGN > 0 ? calculateLtv(liveOutstanding, Number(loan.collateral_amount), priceNGN) : 0;
  const effectiveMarginCallLtv = assetConfig?.marginCallLtv ? adjustedMarginCallLtv(assetConfig.marginCallLtv, vol24h) : null;
  const isHighVol = assetConfig?.type === 'volatile' && vol24h > 5;

  const days = daysBetween(loan.created_at!, new Date());
  const accruedInterest = calculateInterest(Number(loan.outstanding_principal_ngn), days);
  const collateralValue = Number(loan.collateral_amount) * priceNGN;
  const model = Number(loan.loan_amount_ngn) >= 50_000_000 ? 'mpc' as const : 'single_key' as const;

  const ltvColor = !effectiveMarginCallLtv ? 'text-primary'
    : ltv >= (assetConfig?.liquidationLtv || 1) ? 'text-destructive'
    : ltv >= effectiveMarginCallLtv ? 'text-warning'
    : 'text-primary';

  const handleRepay = async () => {
    const amt = parseFloat(repayAmount);
    if (!amt || amt <= 0 || !wallet) return;
    if (amt > Number(wallet.ngn_balance)) {
      toast({ title: 'Insufficient balance', variant: 'destructive' });
      return;
    }
    setRepaying(true);
    try {
      const interestPortion = Math.min(amt, accruedInterest);
      const principalPortion = amt - interestPortion;
      await supabase.from('loan_repayments').insert({
        loan_id: loan.id, user_id: user!.id, amount_ngn: amt, principal_portion: principalPortion, interest_portion: interestPortion,
      });
      const newPrincipal = Math.max(0, Number(loan.outstanding_principal_ngn) - principalPortion);
      const newTotal = Math.max(0, liveOutstanding - amt);
      const isFullyRepaid = newTotal <= 0;
      await supabase.from('loans').update({
        outstanding_principal_ngn: newPrincipal, total_outstanding_ngn: newTotal, accrued_interest_ngn: Math.max(0, accruedInterest - interestPortion),
        ...(isFullyRepaid ? { status: 'repaid', repaid_at: new Date().toISOString() } : {}),
      }).eq('id', loan.id);
      await supabase.from('wallets').update({ ngn_balance: Number(wallet.ngn_balance) - amt }).eq('user_id', user!.id);
      if (isFullyRepaid && deposit) {
        await supabase.from('collateral_deposits').update({ status: 'released', released_at: new Date().toISOString() }).eq('id', deposit.id);
        toast({ title: 'Loan fully repaid!', description: `Your ${loan.collateral_asset} is being returned. ETA: 10 minutes.` });
      } else {
        toast({ title: 'Repayment successful', description: `${formatNaira(amt)} applied.` });
      }
      setRepayAmount('');
      refetchLoan();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRepaying(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/loans" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg font-heading" style={{ backgroundColor: (assetConfig?.color || '#666') + '20', color: assetConfig?.color }}>
            {loan.collateral_asset?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-700 text-foreground">FLX-{loan.id.slice(0, 5).toUpperCase()}</span>
              <MpcBadge model={model} />
              <Badge variant={loan.status === 'active' ? 'default' : loan.status === 'repaid' ? 'secondary' : loan.status === 'margin_call' ? 'destructive' : 'outline'}>
                {loan.status === 'margin_call' ? 'Margin Call' : loan.status}
              </Badge>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Outstanding */}
          <div className="flux-card p-6">
            <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
            <p className={`font-heading text-3xl font-800 tabular-nums ${ltvColor}`}>{formatNaira(liveOutstanding)}</p>
          </div>

          {/* LTV Panel */}
          {loan.status !== 'repaid' && (
            <div className="flux-card p-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Current LTV</p>
                <span className={`font-heading font-800 text-2xl tabular-nums ${ltvColor}`}>{(ltv * 100).toFixed(1)}%</span>
              </div>
              <LtvBar
                currentLtv={ltv}
                marginCallLtv={effectiveMarginCallLtv}
                liquidationLtv={assetConfig?.liquidationLtv ?? null}
                maxLtv={assetConfig?.maxLtv || 1}
              />
              <p className="text-[10px] text-muted-foreground">Updates every 60 seconds</p>

              {isHighVol && (
                <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning">
                    High volatility on {loan.collateral_asset}. Margin call adjusted to {effectiveMarginCallLtv ? (effectiveMarginCallLtv * 100).toFixed(1) : '—'}%.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Balance Breakdown */}
          {loan.status !== 'repaid' && (
            <div className="flux-card p-6 space-y-2">
              <p className="text-sm text-muted-foreground mb-2">Balance Breakdown</p>
              {[
                ['Principal', formatNaira(Number(loan.outstanding_principal_ngn))],
                ['Accrued interest', formatNaira(accruedInterest)],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="font-heading text-foreground tabular-nums">{v}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Total due</span>
                <span className="font-heading font-700 text-primary tabular-nums">{formatNaira(liveOutstanding)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Interest rate: {(DAILY_RATE * 100).toFixed(2)}%/day</p>
            </div>
          )}

          {/* Repayment */}
          {loan.status === 'active' && (
            <div className="flux-card p-6 space-y-4">
              <p className="text-sm font-medium text-foreground">Repay Loan</p>
              <Input type="number" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} placeholder={liveOutstanding.toFixed(2)} className="bg-secondary border-border font-heading tabular-nums" />
              <p className="text-xs text-muted-foreground">Wallet balance: {formatNaira(Number(wallet?.ngn_balance || 0))}</p>
              <Button onClick={handleRepay} className="w-full flux-glow-btn font-heading font-600" disabled={repaying || !repayAmount}>
                {repaying ? 'Processing...' : 'Repay from Wallet'}
              </Button>
            </div>
          )}

          {/* Collateral Info */}
          <div className="flux-card p-6 space-y-3">
            <p className="text-sm font-medium text-foreground">Collateral</p>
            {[
              ['Asset', `${Number(loan.collateral_amount)} ${loan.collateral_asset} (${assetConfig?.network || ''})`],
              ['Current value', formatNaira(collateralValue)],
              ['Status', 'In escrow'],
              ['Custody', 'Flux smart contract escrow'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{l}</span>
                <span className="text-foreground text-xs font-heading">{v}</span>
              </div>
            ))}
            {deposit?.tx_hash && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TX Hash</span>
                <a href={`https://etherscan.io/tx/${deposit.tx_hash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  {deposit.tx_hash.slice(0, 10)}...<ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">CBN Licensed Lending · Flux MFB · RC 1234567</p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
