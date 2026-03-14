import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import FluxBrandMark from '@/components/flux/FluxBrandMark';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        });
        if (error) throw error;
        toast({ title: 'Check your email', description: 'Password reset link sent.' });
        setMode('signin');
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;

        const { data: { user } } = await supabase.auth.getUser();
        if (user && phone) {
          await supabase.from('profiles').update({ phone }).eq('id', user.id);
        }

        toast({ title: 'Account created!', description: 'Redirecting to onboarding...' });
        navigate('/onboarding');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('kyc_status').eq('id', user.id).single();
          navigate(profile?.kyc_status === 'approved' ? '/dashboard' : '/onboarding');
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <FluxBrandMark size="lg" />
          </div>
          <p className="text-sm text-muted-foreground font-body">
            The Crypto-Fiat Credit Layer for Africa
          </p>
        </div>

        <div className="flux-card p-8">
          {mode !== 'forgot' && (
            <div className="flex gap-2 mb-8">
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === 'signin' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sign Up
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-6">
              <button onClick={() => setMode('signin')} className="text-sm text-primary hover:underline">← Back to sign in</button>
              <h2 className="font-heading text-lg font-700 text-foreground mt-3">Reset Password</h2>
              <p className="text-sm text-muted-foreground">Enter your email to receive a reset link.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Amaka Okonkwo" required className="mt-1.5 bg-secondary border-border" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" className="mt-1.5 bg-secondary border-border" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1.5 bg-secondary border-border" />
            </div>

            {mode !== 'forgot' && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1.5 bg-secondary border-border" />
              </div>
            )}

            {mode === 'signin' && (
              <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary hover:underline">
                Forgot password?
              </button>
            )}

            <Button type="submit" className="w-full flux-glow-btn font-heading font-600" disabled={loading}>
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          By continuing, you agree to Flux's Terms and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
