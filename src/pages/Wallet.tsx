import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatNaira, parseCurrencyInput } from '@/lib/loan-utils';
import { NIGERIAN_BANKS, mockNameEnquiry } from '@/lib/banks';
import { Copy, Check, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [sendStep, setSendStep] = useState(0); // 0=none, 1=recipient, 2=amount, 3=confirm
  const [recipientAcct, setRecipientAcct] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [fetchingName, setFetchingName] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [sending, setSending] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('wallets').select('*').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: transfers } = useQuery({
    queryKey: ['transfers', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('nip_transfers').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const balance = Number(wallet?.ngn_balance || 0);
  const fee = 50;
  const bankName = NIGERIAN_BANKS.find(b => b.code === bankCode)?.name || '';
  const amt = parseCurrencyInput(sendAmount);

  const handleAccountLookup = async () => {
    if (recipientAcct.length !== 10 || !bankCode) return;
    setFetchingName(true);
    const name = await mockNameEnquiry(recipientAcct);
    setRecipientName(name);
    setFetchingName(false);
  };

  const handleSend = async () => {
    if (amt + fee > balance) {
      toast({ title: 'Insufficient balance', variant: 'destructive' });
      return;
    }
    setSending(true);

    try {
      const { data: transfer, error } = await supabase.from('nip_transfers').insert({
        user_id: user!.id,
        amount_ngn: amt,
        recipient_account_number: recipientAcct,
        recipient_bank_code: bankCode,
        recipient_bank_name: bankName,
        recipient_account_name: recipientName,
        narration: narration || null,
        status: 'processing',
        fee_ngn: fee,
        nip_session_id: 'NIP' + Date.now(),
      }).select().single();

      if (error) throw error;

      // Debit wallet
      await supabase.from('wallets').update({
        ngn_balance: balance - amt - fee,
      }).eq('user_id', user!.id);

      // Simulate NIP processing
      setTimeout(async () => {
        const success = Math.random() > 0.1; // 90% success
        if (success) {
          await supabase.from('nip_transfers').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            nip_response_code: '00',
          }).eq('id', transfer.id);
          toast({ title: 'Transfer successful', description: `${formatNaira(amt)} sent to ${recipientName}` });
        } else {
          // Reverse
          await supabase.from('nip_transfers').update({
            status: 'failed',
            nip_response_code: '51',
          }).eq('id', transfer.id);
          await supabase.from('wallets').update({
            ngn_balance: balance,
          }).eq('user_id', user!.id);
          toast({ title: 'Transfer failed', description: 'Your balance has been restored.', variant: 'destructive' });
        }
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['transfers'] });
      }, 5000);

      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setSendStep(0);
      setRecipientAcct('');
      setBankCode('');
      setRecipientName('');
      setSendAmount('');
      setNarration('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const copyAccount = () => {
    if (wallet?.ngn_account_number) {
      navigator.clipboard.writeText(wallet.ngn_account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'completed': return 'text-primary';
      case 'failed': case 'reversed': return 'text-destructive';
      default: return 'text-warning';
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl p-6 space-y-6">
        {/* Balance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flux-card p-8">
          <p className="text-sm text-muted-foreground mb-1">Wallet Balance</p>
          <h2 className="font-heading text-4xl font-800 text-primary mb-2">{formatNaira(balance)}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{wallet?.ngn_account_number || '—'}</span>
            <span>·</span>
            <span>{wallet?.ngn_bank_name}</span>
            {wallet?.ngn_account_number && (
              <button onClick={copyAccount}>
                {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
        </motion.div>

        {/* Send Money */}
        {sendStep === 0 ? (
          <Button onClick={() => setSendStep(1)} className="w-full flux-glow-btn font-heading font-600">
            Send Money <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <AnimatePresence mode="wait">
            {sendStep === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flux-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSendStep(0)} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h3 className="font-heading font-700 text-foreground">Recipient Details</h3>
                </div>

                <div>
                  <Label>Bank</Label>
                  <Select value={bankCode} onValueChange={(v) => { setBankCode(v); setRecipientName(''); }}>
                    <SelectTrigger className="mt-1.5 bg-secondary border-border">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_BANKS.map(b => (
                        <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={recipientAcct}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setRecipientAcct(v);
                      setRecipientName('');
                      if (v.length === 10 && bankCode) {
                        handleAccountLookup();
                      }
                    }}
                    placeholder="0123456789"
                    maxLength={10}
                    className="mt-1.5 bg-secondary border-border"
                  />
                </div>

                {fetchingName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Fetching account name...
                  </div>
                )}

                {recipientName && (
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-sm font-heading font-600 text-primary">{recipientName}</p>
                    <p className="text-xs text-muted-foreground">{bankName}</p>
                  </div>
                )}

                <Button
                  onClick={() => setSendStep(2)}
                  className="w-full flux-glow-btn font-heading font-600"
                  disabled={!recipientName || !bankCode}
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {sendStep === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flux-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSendStep(1)} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h3 className="font-heading font-700 text-foreground">Enter Amount</h3>
                </div>

                <div>
                  <Label>Amount (₦)</Label>
                  <Input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="10,000"
                    className="mt-1.5 bg-secondary border-border font-heading text-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {formatNaira(balance)} · Fee: ₦{fee}
                  </p>
                </div>

                <div>
                  <Label>Narration (optional)</Label>
                  <Input
                    value={narration}
                    onChange={(e) => setNarration(e.target.value.slice(0, 100))}
                    placeholder="Payment for..."
                    maxLength={100}
                    className="mt-1.5 bg-secondary border-border"
                  />
                </div>

                <Button
                  onClick={() => setSendStep(3)}
                  className="w-full flux-glow-btn font-heading font-600"
                  disabled={amt <= 0 || amt + fee > balance}
                >
                  Review
                </Button>
              </motion.div>
            )}

            {sendStep === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flux-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSendStep(2)} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h3 className="font-heading font-700 text-foreground">Confirm Transfer</h3>
                </div>

                <div className="space-y-2">
                  {[
                    ['To', `${recipientName} · ${bankName}`],
                    ['Account', recipientAcct],
                    ['Amount', formatNaira(amt)],
                    ['Fee', `₦${fee}`],
                    ['Total', formatNaira(amt + fee)],
                    ...(narration ? [['Narration', narration]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-heading">{value}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleSend}
                  className="w-full flux-glow-btn font-heading font-600"
                  disabled={sending}
                >
                  {sending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </div>
                  ) : 'Send Now'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Transfer History */}
        {transfers && transfers.length > 0 && (
          <div>
            <h3 className="font-heading text-lg font-700 text-foreground mb-4">Transfer History</h3>
            <div className="space-y-2">
              {transfers.map(t => (
                <div key={t.id} className="flux-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-heading font-600 text-foreground">{t.recipient_account_name}</p>
                    <p className="text-xs text-muted-foreground">{t.recipient_bank_name} · {new Date(t.created_at!).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-heading font-600 text-foreground">-{formatNaira(Number(t.amount_ngn))}</p>
                    <span className={`text-xs font-medium ${statusColor(t.status!)}`}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
