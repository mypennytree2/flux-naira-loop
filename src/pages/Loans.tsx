import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LtvBar from '@/components/flux/LtvBar';
import MpcBadge from '@/components/flux/MpcBadge';
import { formatNaira, getTotalOutstanding } from '@/lib/loan-utils';
import { ASSETS, type AssetKey, calculateLtv } from '@/config/assets';
import { ArrowRight, Plus } from 'lucide-react';

export default function LoansPage() {
  const { user } = useAuth();

  const { data: loans } = useQuery({
    queryKey: ['loans', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('loans').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
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

  const activeLoans = loans?.filter(l => ['active', 'margin_call', 'pending_approval', 'confirming'].includes(l.status || ''));
  const closedLoans = loans?.filter(l => ['repaid', 'liquidated', 'cancelled'].includes(l.status || ''));

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-800 text-foreground">Loans</h1>
          <Button asChild size="sm" className="flux-glow-btn font-heading font-600">
            <Link to="/borrow"><Plus className="h-4 w-4 mr-1" /> New Loan</Link>
          </Button>
        </div>

        {!loans?.length ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flux-card p-10 text-center">
            <p className="text-muted-foreground mb-4">No loans yet.</p>
            <Button asChild className="flux-glow-btn font-heading font-600">
              <Link to="/borrow">Get your first loan <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {activeLoans && activeLoans.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-heading font-600 text-muted-foreground uppercase tracking-wider">Active</h3>
                {activeLoans.map((loan, i) => {
                  const price = prices?.find(p => p.asset === loan.collateral_asset);
                  const outstanding = getTotalOutstanding(Number(loan.outstanding_principal_ngn), loan.created_at!);
                  const ltv = price ? calculateLtv(outstanding, Number(loan.collateral_amount), Number(price.price_ngn)) : 0;
                  const assetConfig = Object.values(ASSETS).find(a => a.symbol === loan.collateral_asset);
                  const model = Number(loan.loan_amount_ngn) >= 50_000_000 ? 'mpc' as const : 'single_key' as const;

                  return (
                    <motion.div key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link to={`/loans/${loan.id}`} className="flux-card block p-5 hover:border-primary/20 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-heading font-700" style={{ backgroundColor: (assetConfig?.color || '#666') + '20', color: assetConfig?.color }}>
                              {loan.collateral_asset?.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-heading font-600 text-foreground">{Number(loan.collateral_amount)} {loan.collateral_asset}</span>
                                <MpcBadge model={model} />
                              </div>
                              <p className="text-xs text-muted-foreground">Borrowed {formatNaira(Number(loan.loan_amount_ngn))}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-heading font-700 text-foreground tabular-nums">{formatNaira(outstanding)}</p>
                            <Badge variant={loan.status === 'margin_call' ? 'destructive' : 'outline'} className="text-[10px]">
                              {loan.status === 'margin_call' ? 'Margin Call' : loan.status}
                            </Badge>
                          </div>
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
            )}

            {closedLoans && closedLoans.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-heading font-600 text-muted-foreground uppercase tracking-wider">Closed</h3>
                {closedLoans.map(loan => (
                  <Link key={loan.id} to={`/loans/${loan.id}`} className="flux-card block p-4 opacity-60 hover:opacity-80 transition-opacity">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-600 text-foreground text-sm">{Number(loan.collateral_amount)} {loan.collateral_asset}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm text-muted-foreground">{formatNaira(Number(loan.loan_amount_ngn))}</span>
                        <Badge variant="secondary" className="text-[10px]">{loan.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
