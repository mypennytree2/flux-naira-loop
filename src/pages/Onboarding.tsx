import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy, Shield } from 'lucide-react';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);
  const [agreed, setAgreed] = useState(false);
  const [copied, setCopied] = useState('');
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStep1 = async () => {
    if (bvn.length !== 11 || nin.length !== 11) {
      toast({ title: 'Invalid input', description: 'BVN and NIN must be 11 digits.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // Mock verification
      await supabase.from('profiles').update({
        bvn,
        bvn_verified: true,
        nin,
        nin_verified: true,
        kyc_tier: 1,
        kyc_status: 'approved',
      }).eq('id', user!.id);

      await refreshProfile();
      setStep(2);

      // Simulate wallet provisioning
      setTimeout(async () => {
        const mockWallet = {
          user_id: user!.id,
          ngn_account_number: '0' + Math.floor(100000000 + Math.random() * 900000000).toString(),
          ngn_account_name: user?.user_metadata?.full_name || 'Flux User',
          ngn_bank_name: 'Flux MFB',
          ngn_bank_code: '090XXX',
          crypto_deposit_address: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          crypto_deposit_address_solana: Array.from({ length: 44 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join(''),
          crypto_deposit_address_xrp: 'r' + Array.from({ length: 33 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join(''),
        };

        const { data, error } = await supabase.from('wallets').insert(mockWallet).select().single();
        if (error) throw error;
        setWalletData(data);
        setLoading(false);
      }, 1500);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  const progress = (step / 3) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-800 text-primary mb-2">FLUX</h1>
          <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Step {step} of 3</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flux-card p-8 space-y-6"
            >
              <div>
                <h2 className="font-heading text-xl font-700 text-foreground mb-1">Personal Verification</h2>
                <p className="text-sm text-muted-foreground">We need to verify your identity to proceed.</p>
              </div>

              <div>
                <Label htmlFor="bvn">BVN (11 digits)</Label>
                <Input
                  id="bvn"
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="12345678901"
                  className="mt-1.5 bg-secondary border-border"
                  maxLength={11}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  We use your BVN to verify your identity only. We do not debit your linked accounts.
                </p>
              </div>

              <div>
                <Label htmlFor="nin">NIN (11 digits)</Label>
                <Input
                  id="nin"
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="12345678901"
                  className="mt-1.5 bg-secondary border-border"
                  maxLength={11}
                />
              </div>

              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="mt-1.5 bg-secondary border-border"
                />
              </div>

              <Button
                onClick={handleStep1}
                className="w-full flux-glow-btn font-heading font-600"
                disabled={loading || bvn.length !== 11 || nin.length !== 11}
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : 'Verify & Continue'}
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flux-card p-8 space-y-6"
            >
              {loading || !walletData ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <div className="h-12 w-12 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                  <p className="text-muted-foreground">Setting up your account...</p>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="font-heading text-xl font-700 text-foreground">Your Flux account is ready.</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg bg-secondary p-4">
                      <p className="text-xs text-muted-foreground mb-1">Naira Virtual Account</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-heading text-lg font-700 text-foreground">{walletData.ngn_account_number}</p>
                          <p className="text-sm text-muted-foreground">{walletData.ngn_account_name} · {walletData.ngn_bank_name}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(walletData.ngn_account_number, 'ngn')}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copied === 'ngn' ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg bg-secondary p-4">
                      <p className="text-xs text-muted-foreground mb-2">Crypto Deposit Addresses</p>
                      {[
                        { label: 'EVM (ETH/BNB/USDC)', address: walletData.crypto_deposit_address },
                        { label: 'Solana', address: walletData.crypto_deposit_address_solana },
                        { label: 'XRP', address: walletData.crypto_deposit_address_xrp },
                      ].map(({ label, address }) => (
                        <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-xs font-mono text-foreground truncate">{address}</p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(address, label)}
                            className="ml-2 text-muted-foreground hover:text-foreground"
                          >
                            {copied === label ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={() => setStep(3)} className="w-full flux-glow-btn font-heading font-600">
                    Continue
                  </Button>
                </>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flux-card p-8 space-y-6"
            >
              <div>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-heading text-xl font-700 text-foreground text-center mb-4">Compliance Notice</h2>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Flux is licensed by the Central Bank of Nigeria to provide credit facilities.</p>
                <p>Borrowing against your crypto is a loan — not a disposal. No capital gains tax applies.</p>
                <p>All transactions are monitored for AML compliance under NFIU guidelines.</p>
              </div>

              <div className="flex items-start gap-3 pt-4">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(c) => setAgreed(!!c)}
                />
                <label htmlFor="agree" className="text-sm text-foreground cursor-pointer">
                  I understand and agree to the Flux Terms and Lending Agreement
                </label>
              </div>

              <Button
                onClick={handleFinish}
                className="w-full flux-glow-btn font-heading font-600"
                disabled={!agreed}
              >
                Go to Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
