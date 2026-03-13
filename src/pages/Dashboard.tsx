import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatNaira, getTotalOutstanding, calculateInterest, daysBetween, DAILY_RATE } from '@/lib/loan-utils';
import { COLLATERAL_ASSETS, type CollateralAssetKey } from '@/lib/collateral-assets';
import { ArrowRight, Copy, Check, AlertTriangle, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('wallets').select('*').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: loans } = useQuery({
    queryKey: ['loans', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('loans').select('*').eq('user_id', user!.id).in('status', ['active', 'margin_call', 'pending_approval']);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: repayments } = useQuery({
    queryKey: ['repayments', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('loan_repayments').select('amount_ngn').eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: prices } = useQuery({
    queryKey: ['prices'],
    queryFn: async () => {
      const { data } = await supabase.from('price_feed').select('*');
      return data || [];
    },
    refetchInterval: 30000,
  });

  const copyAccount = () => {
    if (wallet?.ngn_account_number) {
      navigator.clipboard.writeText(wallet.ngn_account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const totalCollateral = loans?.reduce((sum, l) => {
    const price = prices?.find(p => p.asset === l.collateral_asset);
    return sum + (l.collateral_amount * (price?.price_ngn || 0));
  }, 0) || 0;

  const totalInterestPaid = repayments?.reduce((sum, r) => sum + Number(r.amount_ngn), 0) || 0;

  const firstLoanDate = loans?.length ? loans.reduce((min, l) => 
    new Date(l.created_at!) < new Date(min) ? l.created_at! : min, loans[0].created_at!) : null;

  const daysSinceFirst = firstLoanDate ? Math.floor(daysBetween(firstLoanDate, new Date())) : 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl p-6 space-y-8">
        {/* Wallet Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flux-card p-8"
        >
          <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
          <h2 className="font-heading text-4xl md:text-5xl font-800 text-primary mb-2">
            {formatNaira(Number(wallet?.ngn_balance || 0))}
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <span>{wallet?.ngn_account_number || '—'}</span>
            <span>·</span>
            <span>{wallet?.ngn_bank_name || 'Flux MFB'}</span>
            {wallet?.ngn_account_number && (
              <button onClick={copyAccount} className="text-muted-foreground hover:text-foreground">
                {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Button asChild className="flux-glow-btn font-heading font-600">
              <Link to="/wallet">Send Money</Link>
            </Button>
            <Button asChild variant="outline" className="font-heading font-600">
              <Link to="/borrow">Borrow</Link>
            </Button>
          </div>
        </motion.div>

        {/* Active Loans */}
        <div>
          <h3 className="font-heading text-lg font-700 text-foreground mb-4">Active Loans</h3>
          {!loans?.length ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flux-card p-8 text-center"
            >
              <p className="text-muted-foreground mb-4">No active loans. Ready to borrow?</p>
              <Button asChild className="flux-glow-btn font-heading font-600">
                <Link to="/borrow">Get a Loan <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {loans.map((loan, i) => {
                const asset = COLLATERAL_ASSETS[loan.collateral_asset as CollateralAssetKey];
                const price = prices?.find(p => p.asset === loan.collateral_asset);
                const totalOutstanding = getTotalOutstanding(Number(loan.outstanding_principal_ngn), loan.created_at!);
                const currentLTV = price
                  ? (totalOutstanding / (Number(loan.collateral_amount) * Number(price.price_ngn))) * 100
                  : 0;

                const ltvColor = currentLTV >= (asset?.liquidationLTV || 90) ? 'text-destructive'
                  : currentLTV >= (asset?.marginCallLTV || 85) ? 'text-warning'
                  : 'text-primary';

                const dotColor = currentLTV >= (asset?.liquidationLTV || 90) ? 'bg-destructive'
                  : currentLTV >= (asset?.marginCallLTV || 85) ? 'bg-warning'
                  : 'bg-primary';

                return (
                  <motion.div
                    key={loan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {loan.margin_call_triggered && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-t-lg bg-warning/10 border border-warning/20 border-b-0">
                        <AlertTriangle className="h-3 w-3 text-warning" />
                        <span className="text-xs text-warning font-medium">Margin call active — top up your collateral</span>
                      </div>
                    )}
                    <Link
                      to={`/loans/${loan.id}`}
                      className={`flux-card block p-5 hover:border-border/50 transition-colors ${loan.margin_call_triggered ? 'rounded-t-none' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-heading"
                            style={{ backgroundColor: asset?.color + '20', color: asset?.color }}
                          >
                            {asset?.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-600 text-foreground">
                                {Number(loan.collateral_amount)} {loan.collateral_asset}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {loan.status === 'pending_approval' ? 'Pending' : 'Active'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Borrowed {formatNaira(Number(loan.loan_amount_ngn))}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-heading font-600 text-foreground">{formatNaira(totalOutstanding)}</p>
                          <div className="flex items-center justify-end gap-1.5">
                            <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                            <span className={`text-xs font-medium ${ltvColor}`}>{currentLTV.toFixed(1)}% LTV</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {loans && loans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="flux-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Collateral Locked</p>
              <p className="font-heading text-lg font-700 text-foreground">{formatNaira(totalCollateral)}</p>
            </div>
            <div className="flux-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Interest Paid</p>
              <p className="font-heading text-lg font-700 text-foreground">{formatNaira(totalInterestPaid)}</p>
            </div>
            <div className="flux-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Days Active</p>
              <p className="font-heading text-lg font-700 text-foreground">{daysSinceFirst}</p>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
