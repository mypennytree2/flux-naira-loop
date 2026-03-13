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
import { COLLATERAL_ASSETS, type CollateralAssetKey } from '@/lib/collateral-assets';
import { formatNaira, calculateLTV, getTotalOutstanding, calculateInterest, daysBetween, DAILY_RATE } from '@/lib/loan-utils';
import { AlertTriangle, ExternalLink, ArrowLeft } from 'lucide-react';

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

  // Update outstanding every 60s
  useEffect(() => {
    if (!loan) return;
    const update = () => {
      setLiveOutstanding(getTotalOutstanding(Number(loan.outstanding_principal_ngn), loan.created_at!));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [loan]);

  if (!loan) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const asset = COLLATERAL_ASSETS[loan.collateral_asset as CollateralAssetKey];
  const price = prices?.find(p => p.asset === loan.collateral_asset);

  const ltvResult = price ? calculateLTV(
    liveOutstanding,
    loan.collateral_asset,
    Number(loan.collateral_amount),
    Number(price.price_ngn),
    Number(price.volatility_24h_pct)
  ) : null;

  const days = daysBetween(loan.created_at!, new Date());
  const accruedInterest = calculateInterest(Number(loan.outstanding_principal_ngn), days);

  const ltvBarWidth = ltvResult ? Math.min(ltvResult.currentLTV, 100) : 0;
  const ltvBarColor = ltvResult
    ? ltvResult.status === 'liquidation_zone' ? 'bg-destructive'
    : ltvResult.status === 'margin_call' ? 'bg-warning'
    : ltvResult.status === 'caution' ? 'bg-warning'
    : 'bg-primary'
    : 'bg-primary';

  const handleRepay = async () => {
    const amt = parseFloat(repayAmount);
    if (!amt || amt <= 0 || !wallet) return;

    if (amt > Number(wallet.ngn_balance)) {
      toast({ title: 'Insufficient balance', description: 'You don\'t have enough in your wallet.', variant: 'destructive' });
      return;
    }

    setRepaying(true);
    try {
      const interestPortion = Math.min(amt, accruedInterest);
      const principalPortion = amt - interestPortion;

      // Insert repayment
      await supabase.from('loan_repayments').insert({
        loan_id: loan.id,
        user_id: user!.id,
        amount_ngn: amt,
        principal_portion: principalPortion,
        interest_portion: interestPortion,
      });

      // Update loan
      const newPrincipal = Math.max(0, Number(loan.outstanding_principal_ngn) - principalPortion);
      const newTotal = Math.max(0, liveOutstanding - amt);
      const isFullyRepaid = newTotal <= 0;

      await supabase.from('loans').update({
        outstanding_principal_ngn: newPrincipal,
        total_outstanding_ngn: newTotal,
        accrued_interest_ngn: Math.max(0, accruedInterest - interestPortion),
        ...(isFullyRepaid ? { status: 'repaid', repaid_at: new Date().toISOString() } : {}),
      }).eq('id', loan.id);

      // Debit wallet
      const newBalance = Number(wallet.ngn_balance) - amt;
      await supabase.from('wallets').update({ ngn_balance: newBalance }).eq('user_id', user!.id);

      // Release collateral if fully repaid
      if (isFullyRepaid && deposit) {
        await supabase.from('collateral_deposits').update({
          status: 'released',
          released_at: new Date().toISOString(),
        }).eq('id', deposit.id);

        toast({
          title: 'Loan fully repaid!',
          description: `Your ${loan.collateral_asset} is being returned to your wallet. ETA: 10 minutes.`,
        });
      } else {
        toast({ title: 'Repayment successful', description: `${formatNaira(amt)} applied to your loan.` });
      }

      setRepayAmount('');
      refetchLoan();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRepaying(false);
    }
  };

  const shortId = 'FLX-' + loan.id.slice(0, 5).toUpperCase();

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-heading"
            style={{ backgroundColor: asset?.color + '20', color: asset?.color }}
          >
            {asset?.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-700 text-foreground">{shortId}</span>
              <Badge variant={loan.status === 'active' ? 'default' : loan.status === 'repaid' ? 'secondary' : 'outline'}>
                {loan.status}
              </Badge>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Disbursed */}
          <div className="flux-card p-6">
            <p className="text-xs text-muted-foreground mb-1">Disbursed</p>
            <p className="font-heading text-3xl font-800 text-primary">{formatNaira(Number(loan.net_disbursed_ngn))}</p>
          </div>

          {/* LTV Health */}
          {ltvResult && loan.status !== 'repaid' && (
            <div className="flux-card p-6 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">LTV Health</p>
                <span className={`font-heading font-700 text-lg ${
                  ltvResult.status === 'healthy' ? 'text-primary' :
                  ltvResult.status === 'caution' ? 'text-warning' :
                  'text-destructive'
                }`}>
                  {ltvResult.currentLTV.toFixed(1)}%
                </span>
              </div>

              <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${ltvBarColor}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${ltvBarWidth}%` }}
                  transition={{ duration: 1 }}
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Collateral: {formatNaira(ltvResult.currentCollateralValueNGN)}</span>
                <span>Margin call: {ltvResult.effectiveMarginCallLTV.toFixed(1)}% · Liquidation: {ltvResult.effectiveLiquidationLTV.toFixed(1)}%</span>
              </div>

              {ltvResult.isHighVolatility && (
                <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning">
                    High volatility detected on {loan.collateral_asset}. Margin call threshold adjusted to {ltvResult.effectiveMarginCallLTV.toFixed(1)}%.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Outstanding Balance */}
          {loan.status !== 'repaid' && (
            <div className="flux-card p-6 space-y-2">
              <p className="text-sm text-muted-foreground mb-2">Outstanding Balance</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Principal</span>
                <span className="font-heading text-foreground">{formatNaira(Number(loan.outstanding_principal_ngn))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Accrued interest</span>
                <span className="font-heading text-foreground">{formatNaira(accruedInterest)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Total due</span>
                <span className="font-heading font-700 text-primary">{formatNaira(liveOutstanding)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Interest rate: {(DAILY_RATE * 100).toFixed(2)}%/day</p>
            </div>
          )}

          {/* Repayment */}
          {loan.status === 'active' && (
            <div className="flux-card p-6 space-y-4">
              <p className="text-sm font-medium text-foreground">Repay Loan</p>
              <Input
                type="number"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder={liveOutstanding.toFixed(2)}
                className="bg-secondary border-border font-heading"
              />
              <p className="text-xs text-muted-foreground">
                Wallet balance: {formatNaira(Number(wallet?.ngn_balance || 0))}
              </p>
              <Button
                onClick={handleRepay}
                className="w-full flux-glow-btn font-heading font-600"
                disabled={repaying || !repayAmount}
              >
                {repaying ? 'Processing...' : 'Repay from Wallet'}
              </Button>
            </div>
          )}

          {/* Collateral Info */}
          <div className="flux-card p-6 space-y-3">
            <p className="text-sm font-medium text-foreground">Collateral</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Asset</span>
              <span className="font-heading text-foreground">{Number(loan.collateral_amount)} {loan.collateral_asset}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current value</span>
              <span className="font-heading text-foreground">
                {price ? formatNaira(Number(loan.collateral_amount) * Number(price.price_ngn)) : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custody</span>
              <span className="text-foreground text-xs">Flux smart contract escrow</span>
            </div>
            {deposit?.tx_hash && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TX Hash</span>
                <a
                  href={`https://etherscan.io/tx/${deposit.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {deposit.tx_hash.slice(0, 10)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Collateral held in Flux Escrow Contract · 0x742d...3F4a
            </p>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            CBN Licensed Lending · Flux MFB · RC 1234567
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
