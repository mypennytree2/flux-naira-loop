import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatNaira } from '@/lib/loan-utils';
import { COLLATERAL_ASSETS, type CollateralAssetKey } from '@/lib/collateral-assets';
import { Check, X, Shield, AlertTriangle, Eye } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function AdminPage() {
  const { isAdmin, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingLoans } = useQuery({
    queryKey: ['admin-pending-loans'],
    queryFn: async () => {
      const { data } = await supabase.from('loans').select('*, profiles(full_name, email)').eq('status', 'pending_approval').eq('approval_type', 'manual');
      return data || [];
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: flags } = useQuery({
    queryKey: ['admin-flags'],
    queryFn: async () => {
      const { data } = await supabase.from('transaction_flags').select('*, profiles(full_name, email)').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: activeLoans } = useQuery({
    queryKey: ['admin-active-loans'],
    queryFn: async () => {
      const { data } = await supabase.from('loans').select('*, profiles(full_name)').in('status', ['active', 'margin_call']);
      return data || [];
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: kycQueue } = useQuery({
    queryKey: ['admin-kyc'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('kyc_status', 'under_review');
      return data || [];
    },
    enabled: isAdmin,
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

  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const approveLoan = async (loanId: string, userId: string, netDisbursed: number) => {
    try {
      await supabase.from('loans').update({
        status: 'active',
        approved_at: new Date().toISOString(),
        disbursed_at: new Date().toISOString(),
      }).eq('id', loanId);

      const { data: wallet } = await supabase.from('wallets').select('ngn_balance').eq('user_id', userId).single();
      await supabase.from('wallets').update({
        ngn_balance: Number(wallet?.ngn_balance || 0) + netDisbursed,
      }).eq('user_id', userId);

      toast({ title: 'Loan approved and disbursed' });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-loans'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const rejectLoan = async (loanId: string) => {
    await supabase.from('loans').update({ status: 'rejected' }).eq('id', loanId);
    toast({ title: 'Loan rejected' });
    queryClient.invalidateQueries({ queryKey: ['admin-pending-loans'] });
  };

  const markReviewed = async (flagId: string, userId: string) => {
    await supabase.from('transaction_flags').update({
      reviewed: true,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', flagId);
    queryClient.invalidateQueries({ queryKey: ['admin-flags'] });
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="font-heading text-2xl font-800 text-foreground">Admin Panel</h1>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="pending">Pending Loans ({pendingLoans?.length || 0})</TabsTrigger>
            <TabsTrigger value="flags">Flags ({flags?.filter(f => !f.reviewed).length || 0})</TabsTrigger>
            <TabsTrigger value="active">Active Loans</TabsTrigger>
            <TabsTrigger value="kyc">KYC Queue ({kycQueue?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {!pendingLoans?.length ? (
              <div className="flux-card p-8 text-center text-muted-foreground">No pending loans</div>
            ) : (
              <div className="space-y-3">
                {pendingLoans.map((loan: any) => (
                  <div key={loan.id} className="flux-card p-5 flex items-center justify-between">
                    <div>
                      <p className="font-heading font-600 text-foreground">
                        {loan.profiles?.full_name || loan.profiles?.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatNaira(Number(loan.loan_amount_ngn))} · {Number(loan.collateral_amount)} {loan.collateral_asset}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveLoan(loan.id, loan.user_id, Number(loan.net_disbursed_ngn))} className="flux-glow-btn">
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectLoan(loan.id)}>
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="flags">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flags?.map((flag: any) => (
                    <TableRow key={flag.id}>
                      <TableCell className="font-heading text-sm">{flag.profiles?.full_name || flag.profiles?.email || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{flag.flag_type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={flag.flag_severity === 'high' ? 'destructive' : 'secondary'}>
                          {flag.flag_severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{flag.entity_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(flag.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {flag.reviewed ? (
                          <span className="text-xs text-primary">Reviewed</span>
                        ) : (
                          <span className="text-xs text-warning">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!flag.reviewed && (
                          <Button size="sm" variant="ghost" onClick={() => markReviewed(flag.id, flag.user_id)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="active">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Loan Amount</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>LTV</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLoans?.map((loan: any) => {
                    const asset = COLLATERAL_ASSETS[loan.collateral_asset as CollateralAssetKey];
                    const price = prices?.find(p => p.asset === loan.collateral_asset);
                    const collateralValue = Number(loan.collateral_amount) * Number(price?.price_ngn || 0);
                    const ltv = collateralValue > 0 ? (Number(loan.total_outstanding_ngn) / collateralValue) * 100 : 0;
                    const ltvColor = ltv >= (asset?.liquidationLTV || 90) ? 'text-destructive' : ltv >= (asset?.marginCallLTV || 85) ? 'text-warning' : 'text-primary';

                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="font-heading text-sm">{loan.profiles?.full_name || '—'}</TableCell>
                        <TableCell>
                          <span style={{ color: asset?.color }}>{Number(loan.collateral_amount)} {loan.collateral_asset}</span>
                        </TableCell>
                        <TableCell>{formatNaira(Number(loan.loan_amount_ngn))}</TableCell>
                        <TableCell>{formatNaira(Number(loan.total_outstanding_ngn))}</TableCell>
                        <TableCell>
                          <span className={`font-heading font-700 ${ltvColor}`}>{ltv.toFixed(1)}%</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={loan.margin_call_triggered ? 'destructive' : 'default'}>
                            {loan.margin_call_triggered ? 'Margin Call' : loan.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="kyc">
            {!kycQueue?.length ? (
              <div className="flux-card p-8 text-center text-muted-foreground">No pending KYC reviews</div>
            ) : (
              <div className="space-y-3">
                {kycQueue.map((p: any) => (
                  <div key={p.id} className="flux-card p-5">
                    <p className="font-heading font-600 text-foreground">{p.full_name || p.email}</p>
                    <p className="text-sm text-muted-foreground">BVN: {p.bvn || '—'} · NIN: {p.nin || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
