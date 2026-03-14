import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LtvBar from '@/components/flux/LtvBar';
import NubanDisplay from '@/components/flux/NubanDisplay';
import VolatilityBadge from '@/components/flux/VolatilityBadge';
import MpcBadge from '@/components/flux/MpcBadge';
import { formatNaira, getTotalOutstanding, daysBetween } from '@/lib/loan-utils';
import { ASSETS, calculateLtv } from '@/config/assets';
import { ArrowRight, AlertTriangle, TrendingUp, Send, Landmark } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

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

  const { data: prices } = useQuery({
    queryKey: ['prices'],
    queryFn: async () => {
      const { data } = await supabase.from('price_feed').select('*');
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: recentTransfers } = useQuery({
    queryKey: ['recent-transfers', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('nip_transfers').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const hasMarginCall = loans?.some(l => l.status === 'margin_call' || l.margin_call_triggered);

  const totalOutstanding = loans?.reduce((sum, l) => sum + getTotalOutstanding(Number(l.outstanding_principal_ngn), l.created_at!), 0) || 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        {/* Margin Call Banner */}
        {hasMarginCall && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-xl bg-warning/10 border border-warning/20 p-4">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-heading font-600 text-warning">Margin call active</p>
              <p className="text-xs text-warning/80">Top up your collateral or make a partial repayment within 24 hours.</p>
            </div>
            <Button asChild size="sm" variant="outline" className="ml-auto border-warning/30 text-warning shrink-0">
              <Link to="/loans">View loans</Link>
            </Button>
          </motion.div>
        )}

        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flux-card p-6">
            <p className="text-xs text-muted-foreground mb-1">Available in your Flux wallet</p>
            <h2 className="font-heading text-4xl font-800 text-primary tabular-nums mb-3">
              {formatNaira(Number(wallet?.ngn_balance || 0))}
            </h2>
            {wallet?.ngn_account_number && (
              <NubanDisplay
                accountNumber={wallet.ngn_account_number}
                accountName={wallet.ngn_account_name || 'Flux User'}
                bankName={wallet.ngn_bank_name || 'Flux MFB'}
              />
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flux-card p-6">
            <p className="text-xs text-muted-foreground mb-1">Active loans</p>
            <h2 className="font-heading text-4xl font-800 text-foreground tabular-nums">
              {loans?.length || 0}
            </h2>
            {totalOutstanding > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatNaira(totalOutstanding)} outstanding
              </p>
            )}
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/borrow', icon: Landmark, label: 'Borrow' },
            { to: '/wallet', icon: Send, label: 'Send money' },
            ...(loans?.length ? [
              { to: '/loans', icon: TrendingUp, label: 'Repay' },
            ] : []),
          ].map(({ to, icon: Icon, label }) => (
            <Button key={to} asChild variant="outline" className="h-auto py-4 flex-col gap-2 font-heading font-600">
              <Link to={to}>
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </Button>
          ))}
        </div>

        {/* Loan Cards */}
        {loans && loans.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-700 text-foreground">Your Loans</h3>
              <Button asChild variant="ghost" size="sm" className="text-primary">
                <Link to="/loans">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {loans.slice(0, 4).map((loan, i) => {
                const price = prices?.find(p => p.asset === loan.collateral_asset);
                const outstanding = getTotalOutstanding(Number(loan.outstanding_principal_ngn), loan.created_at!);
                const ltv = price ? calculateLtv(outstanding, Number(loan.collateral_amount), Number(price.price_ngn)) : 0;
                const assetConfig = Object.values(ASSETS).find(a => a.symbol === loan.collateral_asset);
                const model = Number(loan.loan_amount_ngn) >= 50_000_000 ? 'mpc' as const : 'single_key' as const;

                return (
                  <motion.div key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link to={`/loans/${loan.id}`} className="flux-card block p-5 hover:border-primary/20 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-heading font-700" style={{ backgroundColor: (assetConfig?.color || '#666') + '20', color: assetConfig?.color }}>
                            {loan.collateral_asset?.charAt(0)}
                          </div>
                          <div>
                            <span className="font-heading font-600 text-foreground text-sm">{Number(loan.collateral_amount)} {loan.collateral_asset}</span>
                            <MpcBadge model={model} />
                          </div>
                        </div>
                        <span className="font-heading font-700 text-foreground tabular-nums text-sm">{formatNaira(outstanding)}</span>
                      </div>
                      <LtvBar
                        currentLtv={ltv}
                        marginCallLtv={assetConfig?.marginCallLtv ?? null}
                        liquidationLtv={assetConfig?.liquidationLtv ?? null}
                        maxLtv={assetConfig?.maxLtv || 1}
                        showMarkers={false}
                      />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flux-card p-10 text-center">
            <p className="text-muted-foreground mb-4">Ready to borrow?</p>
            <Button asChild className="flux-glow-btn font-heading font-600">
              <Link to="/borrow">Get a Loan <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </motion.div>
        )}

        {/* Market Prices */}
        {prices && prices.length > 0 && (
          <div>
            <h3 className="font-heading text-lg font-700 text-foreground mb-3">Market Prices</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-4">
              {prices.map(p => {
                const assetConfig = Object.values(ASSETS).find(a => a.symbol === p.asset);
                return (
                  <div key={p.asset} className="flux-card p-3 min-w-[140px] shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-6 w-6 rounded flex items-center justify-center text-xs font-heading font-700" style={{ backgroundColor: (assetConfig?.color || '#666') + '20', color: assetConfig?.color }}>
                        {p.asset.charAt(0)}
                      </div>
                      <span className="font-heading font-600 text-foreground text-sm">{p.asset}</span>
                    </div>
                    <p className="font-heading font-700 text-foreground tabular-nums text-sm">{formatNaira(Number(p.price_ngn))}</p>
                    <VolatilityBadge vol24h={Number(p.volatility_24h_pct || 0)} type={assetConfig?.type || 'volatile'} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {recentTransfers && recentTransfers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-lg font-700 text-foreground">Recent Transactions</h3>
              <Button asChild variant="ghost" size="sm" className="text-primary">
                <Link to="/wallet">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
            <div className="space-y-2">
              {recentTransfers.slice(0, 5).map(t => (
                <div key={t.id} className="flux-card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-heading font-600 text-foreground">{t.recipient_account_name}</p>
                    <p className="text-xs text-muted-foreground">{t.recipient_bank_name} · {new Date(t.created_at!).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-heading font-600 text-muted-foreground tabular-nums">-{formatNaira(Number(t.amount_ngn))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
