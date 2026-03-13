import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { COLLATERAL_ASSETS, type CollateralAssetKey } from '@/lib/collateral-assets';
import { formatNaira, calculateLoanTerms, determineApprovalType, DAILY_RATE, ORIGINATION_FEE_RATE } from '@/lib/loan-utils';
import { ArrowLeft, ArrowRight, AlertTriangle, Check, PartyPopper } from 'lucide-react';

export default function BorrowPage() {
  const [step, setStep] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<CollateralAssetKey | null>(null);
  const [amount, setAmount] = useState('');
  const [ltvSlider, setLtvSlider] = useState(50);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'instant' | 'manual' | null>(null);
  const [disbursedAmount, setDisbursedAmount] = useState(0);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: prices } = useQuery({
    queryKey: ['prices'],
    queryFn: async () => {
      const { data } = await supabase.from('price_feed').select('*');
      return data || [];
    },
    refetchInterval: 30000,
  });

  const selectedAssetConfig = selectedAsset ? COLLATERAL_ASSETS[selectedAsset] : null;
  const selectedPrice = prices?.find(p => p.asset === selectedAsset);

  const collateralAmount = parseFloat(amount) || 0;
  const collateralValueNGN = collateralAmount * (Number(selectedPrice?.price_ngn) || 0);

  const terms = useMemo(() => {
    if (!selectedAssetConfig || collateralValueNGN <= 0) return null;
    return calculateLoanTerms(collateralValueNGN, selectedAssetConfig.maxLTV, ltvSlider);
  }, [collateralValueNGN, selectedAssetConfig, ltvSlider]);

  const approval = terms ? determineApprovalType(terms.grossLoan, profile?.kyc_tier || 0) : null;

  const isHighVol = selectedPrice && !selectedAssetConfig?.isStable && Number(selectedPrice.volatility_24h_pct) > 5;
  const volAdjustment = isHighVol
    ? Math.min((Number(selectedPrice!.volatility_24h_pct) - 5) * 0.5, 5)
    : 0;
  const effectiveMarginCallLTV = selectedAssetConfig
    ? selectedAssetConfig.marginCallLTV - volAdjustment
    : 0;

  const handleSubmit = async () => {
    if (!user || !selectedAsset || !selectedAssetConfig || !terms || !selectedPrice) return;
    setLoading(true);

    try {
      // Create collateral deposit
      const { data: deposit, error: depErr } = await supabase.from('collateral_deposits').insert({
        user_id: user.id,
        asset: selectedAsset,
        amount: collateralAmount,
        amount_usd: collateralAmount * Number(selectedPrice.price_usd),
        amount_ngn: collateralValueNGN,
        network: selectedAssetConfig.network,
        status: 'pending',
        tx_hash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        smart_contract_id: '0x742d35Cc6634C0532925a3b844Bc9e7595f3F4a',
      }).select().single();

      if (depErr) throw depErr;

      const approvalDecision = determineApprovalType(terms.grossLoan, profile?.kyc_tier || 0);

      // Create loan
      const { data: loan, error: loanErr } = await supabase.from('loans').insert({
        user_id: user.id,
        collateral_deposit_id: deposit.id,
        collateral_asset: selectedAsset,
        collateral_amount: collateralAmount,
        collateral_value_ngn: collateralValueNGN,
        loan_amount_ngn: terms.grossLoan,
        origination_fee_ngn: terms.originationFee,
        net_disbursed_ngn: terms.netDisbursed,
        max_ltv: selectedAssetConfig.maxLTV,
        outstanding_principal_ngn: terms.grossLoan,
        total_outstanding_ngn: terms.grossLoan,
        current_ltv: terms.ltvToUse,
        margin_call_ltv: effectiveMarginCallLTV,
        liquidation_ltv: selectedAssetConfig.liquidationLTV - volAdjustment,
        fx_volatility_flag: !!isHighVol,
        fx_adjusted_margin_call_ltv: isHighVol ? effectiveMarginCallLTV : null,
        status: 'pending_approval',
        approval_type: approvalDecision.type,
      }).select().single();

      if (loanErr) throw loanErr;

      // Update collateral deposit with loan_id
      await supabase.from('collateral_deposits').update({
        loan_id: loan.id,
        status: 'locked',
        locked_at: new Date().toISOString(),
      }).eq('id', deposit.id);

      if (approvalDecision.type === 'instant') {
        // Simulate instant approval
        setTimeout(async () => {
          await supabase.from('loans').update({
            status: 'active',
            approved_at: new Date().toISOString(),
            disbursed_at: new Date().toISOString(),
            approval_tat_minutes: 0,
          }).eq('id', loan.id);

          // Credit wallet
          const { data: wallet } = await supabase.from('wallets').select('ngn_balance').eq('user_id', user.id).single();
          const newBalance = Number(wallet?.ngn_balance || 0) + terms.netDisbursed;
          await supabase.from('wallets').update({ ngn_balance: newBalance }).eq('user_id', user.id);

          setDisbursedAmount(terms.netDisbursed);
          setResult('instant');
          setLoading(false);
        }, 3000);
      } else {
        setResult('manual');
        setLoading(false);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  if (result) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg p-6 flex items-center justify-center min-h-[80vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flux-card p-8 text-center w-full"
          >
            {result === 'instant' ? (
              <>
                <div className="text-4xl mb-4">🎉</div>
                <h2 className="font-heading text-2xl font-800 text-primary mb-2">
                  {formatNaira(disbursedAmount)}
                </h2>
                <p className="text-foreground mb-1">is in your Flux wallet.</p>
                <p className="text-sm text-muted-foreground mb-6">Tap to send it anywhere.</p>
                <div className="flex gap-3 justify-center">
                  <Button asChild className="flux-glow-btn font-heading font-600">
                    <a href="/wallet">Send Money</a>
                  </Button>
                  <Button asChild variant="outline" className="font-heading font-600">
                    <a href="/dashboard">Dashboard</a>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">📋</div>
                <h2 className="font-heading text-xl font-700 text-foreground mb-2">Application Received</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  We're reviewing your application. You'll be notified within 30–60 minutes.
                </p>
                <Button asChild variant="outline" className="font-heading font-600">
                  <a href="/dashboard">Back to Dashboard</a>
                </Button>
              </>
            )}
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl p-6">
        <div className="mb-6 flex items-center gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h1 className="font-heading text-2xl font-800 text-foreground">New Loan</h1>
          <span className="text-sm text-muted-foreground">Step {step} of 3</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <p className="text-sm text-muted-foreground mb-6">Choose your collateral asset</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(COLLATERAL_ASSETS).map(([key, asset]) => {
                  const price = prices?.find(p => p.asset === key);
                  const highVol = price && !asset.isStable && Number(price.volatility_24h_pct) > 5;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedAsset(key as CollateralAssetKey);
                        setLtvSlider(Math.floor(asset.maxLTV / 2));
                        setStep(2);
                      }}
                      className={`flux-card p-4 text-left hover:border-primary/30 transition-colors`}
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-xl mb-3 font-heading"
                        style={{ backgroundColor: asset.color + '20', color: asset.color }}
                      >
                        {asset.icon}
                      </div>
                      <p className="font-heading font-600 text-foreground text-sm">{asset.symbol}</p>
                      <p className="text-xs text-muted-foreground">{asset.label}</p>
                      {price && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatNaira(Number(price.price_ngn))}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {asset.maxLTV}% LTV
                        </Badge>
                        {highVol && (
                          <span className="flex items-center gap-0.5 text-[10px] text-warning">
                            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                            High vol
                          </span>
                        )}
                        {!highVol && !asset.isStable && (
                          <span className="flex items-center gap-0.5 text-[10px] text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Low vol
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Stablecoins offer higher LTV. Volatile assets have dynamic margin call thresholds.
              </p>
            </motion.div>
          )}

          {step === 2 && selectedAssetConfig && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <Label>How much {selectedAsset} are you depositing?</Label>
                <div className="relative mt-1.5">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-secondary border-border pr-16 text-lg font-heading"
                    step="any"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-heading">
                    {selectedAsset}
                  </span>
                </div>
              </div>

              {collateralAmount > 0 && terms && (
                <div className="flux-card p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Collateral value</span>
                    <span className="text-foreground font-heading font-600">{formatNaira(collateralValueNGN)}</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">LTV Ratio</span>
                      <span className="text-foreground font-heading font-600">{ltvSlider}%</span>
                    </div>
                    <Slider
                      value={[ltvSlider]}
                      onValueChange={([v]) => setLtvSlider(v)}
                      min={10}
                      max={selectedAssetConfig.maxLTV}
                      step={1}
                      className="my-2"
                    />
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">You can borrow</span>
                    <span className="text-primary font-heading font-700 text-lg">{formatNaira(terms.grossLoan)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Origination fee (1%)</span>
                    <span className="text-foreground font-heading">-{formatNaira(terms.originationFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border pt-3">
                    <span className="text-muted-foreground">You receive</span>
                    <span className="text-primary font-heading font-700">{formatNaira(terms.netDisbursed)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Daily interest (0.15%)</span>
                    <span className="text-foreground font-heading">{formatNaira(terms.grossLoan * DAILY_RATE)}/day</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Margin call at</span>
                    <span className="text-foreground font-heading">{effectiveMarginCallLTV.toFixed(1)}% LTV</span>
                  </div>

                  {isHighVol && (
                    <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 mt-2">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                      <p className="text-xs text-warning">
                        Due to current {selectedAsset} volatility, your margin call threshold is tightened to {effectiveMarginCallLTV.toFixed(1)}%.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-3">
                <Checkbox checked={agreed} onCheckedChange={(c) => setAgreed(!!c)} />
                <label className="text-sm text-muted-foreground cursor-pointer">
                  I understand this is a collateralized loan. My crypto remains in secure custody until I repay.
                </label>
              </div>

              <Button
                onClick={() => setStep(3)}
                className="w-full flux-glow-btn font-heading font-600"
                disabled={!agreed || collateralAmount <= 0}
              >
                Review Loan <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 3 && terms && selectedAssetConfig && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flux-card p-6 space-y-4">
                <h3 className="font-heading text-lg font-700 text-foreground">Loan Summary</h3>

                {[
                  ['Collateral', `${collateralAmount} ${selectedAsset} → locked in smart contract`],
                  ['Loan amount', formatNaira(terms.grossLoan)],
                  ['Origination fee', `${formatNaira(terms.originationFee)} (deducted)`],
                  ['You receive', formatNaira(terms.netDisbursed)],
                  ['Daily cost', `${formatNaira(terms.grossLoan * DAILY_RATE)}/day`],
                  ['Approval', approval?.type === 'instant' ? 'Instant' : 'Under review (30–60 min)'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-heading font-600">{value}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full flux-glow-btn font-heading font-600"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Processing...
                  </div>
                ) : (
                  'Confirm & Send Collateral'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Powered by CBN Lending Licence · Flux MFB · RC 1234567
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
