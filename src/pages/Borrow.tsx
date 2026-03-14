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
import { ASSETS, getAssetsSorted, type AssetKey, adjustedMarginCallLtv, contractModel } from '@/config/assets';
import VolatilityBadge from '@/components/flux/VolatilityBadge';
import MpcBadge from '@/components/flux/MpcBadge';
import { formatNaira, DAILY_RATE, ORIGINATION_FEE_RATE } from '@/lib/loan-utils';
import { ArrowLeft, ArrowRight, AlertTriangle, Shield } from 'lucide-react';

export default function BorrowPage() {
  const [step, setStep] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<AssetKey | null>(null);
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

  const assetConfig = selectedAsset ? ASSETS[selectedAsset] : null;
  const priceRow = prices?.find(p => p.asset === assetConfig?.symbol);

  const collateralAmount = parseFloat(amount) || 0;
  const priceNGN = Number(priceRow?.price_ngn || 0);
  const collateralValueNGN = collateralAmount * priceNGN;
  const maxLtvPct = (assetConfig?.maxLtv || 0) * 100;

  const vol24h = Number(priceRow?.volatility_24h_pct || 0);
  const isHighVol = assetConfig?.type === 'volatile' && vol24h > 5;
  const effectiveMarginCallLtv = assetConfig?.marginCallLtv 
    ? adjustedMarginCallLtv(assetConfig.marginCallLtv, vol24h)
    : null;

  const terms = useMemo(() => {
    if (!assetConfig || collateralValueNGN <= 0) return null;
    const ltvDecimal = Math.min(ltvSlider, maxLtvPct) / 100;
    const grossLoan = collateralValueNGN * ltvDecimal;
    const originationFee = grossLoan * ORIGINATION_FEE_RATE;
    const netDisbursed = grossLoan - originationFee;
    return { grossLoan, originationFee, netDisbursed, ltvDecimal };
  }, [collateralValueNGN, assetConfig, ltvSlider, maxLtvPct]);

  const model = terms ? contractModel(terms.grossLoan) : 'single_key';

  const handleSubmit = async () => {
    if (!user || !selectedAsset || !assetConfig || !terms || !priceRow) return;
    setLoading(true);

    try {
      const { data: deposit, error: depErr } = await supabase.from('collateral_deposits').insert({
        user_id: user.id,
        asset: assetConfig.symbol,
        amount: collateralAmount,
        amount_usd: collateralAmount * Number(priceRow.price_usd),
        amount_ngn: collateralValueNGN,
        network: assetConfig.chain,
        status: 'pending',
        tx_hash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        smart_contract_id: '0x742d35Cc6634C0532925a3b844Bc9e7595f3F4a',
      }).select().single();
      if (depErr) throw depErr;

      const isInstant = (profile?.kyc_tier || 0) >= 1 && terms.grossLoan <= 10_000_000;

      const { data: loan, error: loanErr } = await supabase.from('loans').insert({
        user_id: user.id,
        collateral_deposit_id: deposit.id,
        collateral_asset: assetConfig.symbol,
        collateral_amount: collateralAmount,
        collateral_value_ngn: collateralValueNGN,
        loan_amount_ngn: terms.grossLoan,
        origination_fee_ngn: terms.originationFee,
        net_disbursed_ngn: terms.netDisbursed,
        max_ltv: assetConfig.maxLtv * 100,
        outstanding_principal_ngn: terms.grossLoan,
        total_outstanding_ngn: terms.grossLoan,
        current_ltv: terms.ltvDecimal * 100,
        margin_call_ltv: effectiveMarginCallLtv ? effectiveMarginCallLtv * 100 : null,
        liquidation_ltv: assetConfig.liquidationLtv ? assetConfig.liquidationLtv * 100 : null,
        fx_volatility_flag: !!isHighVol,
        fx_adjusted_margin_call_ltv: isHighVol && effectiveMarginCallLtv ? effectiveMarginCallLtv * 100 : null,
        status: 'pending_approval',
        approval_type: isInstant ? 'instant' : 'manual',
      }).select().single();
      if (loanErr) throw loanErr;

      await supabase.from('collateral_deposits').update({
        loan_id: loan.id, status: 'locked', locked_at: new Date().toISOString(),
      }).eq('id', deposit.id);

      if (isInstant) {
        setTimeout(async () => {
          await supabase.from('loans').update({
            status: 'active', approved_at: new Date().toISOString(), disbursed_at: new Date().toISOString(), approval_tat_minutes: 0,
          }).eq('id', loan.id);
          const { data: wallet } = await supabase.from('wallets').select('ngn_balance').eq('user_id', user.id).single();
          await supabase.from('wallets').update({ ngn_balance: Number(wallet?.ngn_balance || 0) + terms.netDisbursed }).eq('user_id', user.id);
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flux-card p-8 text-center w-full">
            {result === 'instant' ? (
              <>
                <div className="text-4xl mb-4">🎉</div>
                <p className="text-sm text-muted-foreground mb-1">Your loan is ready</p>
                <h2 className="font-heading text-3xl font-800 text-primary mb-1 tabular-nums">{formatNaira(disbursedAmount)}</h2>
                <p className="text-foreground mb-1">is in your Flux wallet.</p>
                <p className="text-sm text-muted-foreground mb-6">Tap to send it anywhere.</p>
                <div className="flex gap-3 justify-center">
                  <Button asChild className="flux-glow-btn font-heading font-600"><a href="/wallet">Send Money</a></Button>
                  <Button asChild variant="outline" className="font-heading font-600"><a href="/dashboard">Dashboard</a></Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">📋</div>
                <h2 className="font-heading text-xl font-700 text-foreground mb-2">Application Received</h2>
                <p className="text-sm text-muted-foreground mb-6">Your loan is under review. Target: 30 minutes.</p>
                <Button asChild variant="outline" className="font-heading font-600"><a href="/dashboard">Back to Dashboard</a></Button>
              </>
            )}
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  const sortedAssets = getAssetsSorted();

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl p-6">
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
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="text-sm text-muted-foreground mb-6">Choose your collateral asset</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {sortedAssets.map((asset) => {
                  const price = prices?.find(p => p.asset === asset.symbol);
                  return (
                    <button
                      key={asset.key}
                      onClick={() => {
                        setSelectedAsset(asset.key);
                        setLtvSlider(Math.floor(asset.maxLtv * 50));
                        setStep(2);
                      }}
                      className="flux-card p-4 text-left hover:border-primary/30 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xl mb-3 font-heading" style={{ backgroundColor: asset.color + '20', color: asset.color }}>
                        {asset.symbol.charAt(0)}
                      </div>
                      <p className="font-heading font-600 text-foreground text-sm">{asset.symbol}</p>
                      <p className="text-xs text-muted-foreground">{asset.name}</p>
                      <p className="text-[10px] text-muted-foreground">{asset.network}</p>
                      {price && <p className="text-xs text-muted-foreground mt-1 font-heading tabular-nums">{formatNaira(Number(price.price_ngn))}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] px-1.5">{(asset.maxLtv * 100)}% LTV</Badge>
                        {price && <VolatilityBadge vol24h={Number(price.volatility_24h_pct || 0)} type={asset.type} />}
                      </div>
                      {asset.type === 'ngn_stablecoin' && (
                        <p className="text-[10px] text-primary mt-1">100% LTV — No margin call</p>
                      )}
                    </button>
                  );
                })}
                {/* Placeholder */}
                <div className="flux-card p-4 opacity-40 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground text-center">More coming soon</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && assetConfig && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left — inputs */}
                <div className="space-y-6">
                  <div>
                    <Label>Collateral amount</Label>
                    <div className="relative mt-1.5">
                      <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="bg-secondary border-border pr-20 text-lg font-heading" step="any" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-heading">{assetConfig.symbol}</span>
                    </div>
                  </div>

                  {collateralAmount > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">LTV Ratio</span>
                        <span className="text-foreground font-heading font-600 tabular-nums">{ltvSlider}%</span>
                      </div>
                      <Slider value={[ltvSlider]} onValueChange={([v]) => setLtvSlider(v)} min={10} max={maxLtvPct} step={1} />
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Checkbox checked={agreed} onCheckedChange={(c) => setAgreed(!!c)} />
                    <label className="text-sm text-muted-foreground cursor-pointer">
                      I understand my collateral will be locked in a smart contract until this loan is repaid.
                    </label>
                  </div>
                </div>

                {/* Right — output panel */}
                {collateralAmount > 0 && terms && (
                  <div className="flux-card p-5 space-y-3 h-fit">
                    {[
                      ['Collateral value', formatNaira(collateralValueNGN)],
                      ['Gross loan', formatNaira(terms.grossLoan)],
                      ['Origination fee (1%)', `-${formatNaira(terms.originationFee)}`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{l}</span>
                        <span className="text-foreground font-heading tabular-nums">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm border-t border-border pt-3">
                      <span className="text-muted-foreground">Net disbursement</span>
                      <span className="text-primary font-heading font-700 tabular-nums">{formatNaira(terms.netDisbursed)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Daily interest</span>
                      <span className="text-foreground font-heading tabular-nums">{formatNaira(terms.grossLoan * DAILY_RATE)}/day</span>
                    </div>
                    <div className="border-t border-border pt-3 space-y-2 text-sm">
                      {effectiveMarginCallLtv && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Margin call at LTV</span>
                          <span className="text-foreground font-heading tabular-nums">{(effectiveMarginCallLtv * 100).toFixed(1)}%</span>
                        </div>
                      )}
                      {assetConfig.liquidationLtv && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Liquidation at LTV</span>
                          <span className="text-foreground font-heading tabular-nums">{(assetConfig.liquidationLtv * 100).toFixed(1)}%</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contract model</span>
                        <MpcBadge model={model} />
                      </div>
                    </div>

                    {isHighVol && (
                      <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 mt-2">
                        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                        <p className="text-xs text-warning">
                          Effective margin call tightened to {effectiveMarginCallLtv ? (effectiveMarginCallLtv * 100).toFixed(1) : '—'}% due to elevated volatility.
                        </p>
                      </div>
                    )}

                    {model === 'mpc' && (
                      <div className="flex items-start gap-2 rounded-lg bg-purple-dim p-3">
                        <Shield className="h-4 w-4 text-purple mt-0.5 shrink-0" />
                        <p className="text-xs text-purple">
                          This loan will use Flux Private (MPC). You will complete a key ceremony before the loan is activated.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button onClick={() => setStep(3)} className="w-full mt-6 flux-glow-btn font-heading font-600" disabled={!agreed || collateralAmount <= 0}>
                Review Loan <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 3 && terms && assetConfig && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="flux-card p-6 space-y-4">
                <h3 className="font-heading text-lg font-700 text-foreground">Loan Summary</h3>
                {[
                  ['Asset', `${assetConfig.symbol} (${assetConfig.network})`],
                  ['Collateral', `${collateralAmount} ${assetConfig.symbol}`],
                  ['Collateral value', formatNaira(collateralValueNGN)],
                  ['Gross loan', formatNaira(terms.grossLoan)],
                  ['Origination fee', formatNaira(terms.originationFee)],
                  ['Net disbursement', formatNaira(terms.netDisbursed)],
                  ['Daily interest', `${formatNaira(terms.grossLoan * DAILY_RATE)}/day`],
                  ['Interest rate', '0.15%/day'],
                  ...(effectiveMarginCallLtv ? [['Margin call', `${(effectiveMarginCallLtv * 100).toFixed(0)}% LTV`]] : []),
                  ...(assetConfig.liquidationLtv ? [['Liquidation', `${(assetConfig.liquidationLtv * 100).toFixed(0)}% LTV`]] : []),
                  ['Contract model', model === 'mpc' ? 'FLUX PRIVATE MPC' : 'Single oracle key'],
                  ['Approval', terms.grossLoan <= 10_000_000 && (profile?.kyc_tier || 0) >= 1 ? 'Instant' : 'Under review'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`text-foreground font-heading font-600 tabular-nums ${label === 'Net disbursement' ? 'text-primary text-lg' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Flux may instruct the contract to deploy your idle collateral to approved DeFi protocols. 
                It is always recalled before any action on your loan. Yield earned goes to Flux treasury.
              </p>

              <Button onClick={handleSubmit} className="w-full flux-glow-btn font-heading font-600" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Processing...
                  </div>
                ) : 'Confirm & Send Collateral'}
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
