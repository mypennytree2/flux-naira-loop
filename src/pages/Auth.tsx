import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
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
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;

        // Update phone on profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user && phone) {
          await supabase.from('profiles').update({ phone }).eq('id', user.id);
        }

        toast({ title: 'Account created!', description: 'Redirecting to onboarding...' });
        navigate('/onboarding');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Check KYC status
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('kyc_status').eq('id', user.id).single();
          if (profile?.kyc_status === 'approved') {
            navigate('/dashboard');
          } else {
            navigate('/onboarding');
          }
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-card p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md">
          
          <h1 className="font-heading text-6xl font-800 text-primary mb-6">FLUX</h1>
          <p className="font-heading text-3xl font-700 text-foreground mb-4">
            Borrow Naira.<br />Keep your crypto.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">Tax-free borrowing · Instant approval

          </p>
        </motion.div>
      </div>

      {/* Right: Auth form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md">
          
          {/* Mobile branding */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="font-heading text-4xl font-800 text-primary mb-2">FLUX</h1>
            <p className="text-muted-foreground text-sm">Borrow Naira. Keep your crypto.</p>
          </div>

          <div className="flux-card p-8">
            <div className="flex gap-2 mb-8">
              <button
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                !isSignUp ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`
                }>
                
                Sign In
              </button>
              <button
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                isSignUp ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`
                }>
                
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {isSignUp &&
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden">
                  
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Amaka Okonkwo"
                      required
                      className="mt-1.5 bg-secondary border-border" />
                    
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="mt-1.5 bg-secondary border-border" />
                    
                    </div>
                  </motion.div>
                }
              </AnimatePresence>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1.5 bg-secondary border-border" />
                
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="mt-1.5 bg-secondary border-border" />
                
              </div>

              <Button
                type="submit"
                className="w-full flux-glow-btn font-heading font-600"
                disabled={loading}>
                
                {loading ?
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> :
                isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>
          </div>

          

          
        </motion.div>
      </div>
    </div>);

}