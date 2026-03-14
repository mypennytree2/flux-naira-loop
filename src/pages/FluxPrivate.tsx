import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Shield, Check, ArrowRight } from 'lucide-react';

export default function FluxPrivatePage() {
  const [step, setStep] = useState(1);
  const [ceremonyDone, setCeremonyDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const startCeremony = () => {
    setStep(2);
    // Simulate key ceremony
    const steps = [33, 66, 100];
    steps.forEach((p, i) => {
      setTimeout(() => {
        setProgress(p);
        if (p === 100) setCeremonyDone(true);
      }, (i + 1) * 1500);
    });
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flux-card p-8 border-purple/20 space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-dim">
                  <Shield className="h-8 w-8 text-purple" />
                </div>
                <div className="text-center">
                  <h1 className="font-heading text-2xl font-800 text-foreground mb-2">What is Flux Private?</h1>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    At ₦50M+, your loan is protected by multi-party computation. 
                    No single party — including Flux — can instruct the contract alone.
                  </p>
                </div>

                {/* Diagram */}
                <div className="flex items-center justify-center gap-4 py-6">
                  {['Flux node', 'HSM node', 'Your device'].map((label, i) => (
                    <div key={label} className="flex flex-col items-center gap-2">
                      <div className={`h-14 w-14 rounded-full border-2 flex items-center justify-center text-xs font-heading font-600 ${
                        i < 2 ? 'border-purple text-purple bg-purple-dim' : 'border-muted-foreground text-muted-foreground'
                      }`}>
                        {i < 2 ? '✓' : '?'}
                      </div>
                      <span className="text-xs text-muted-foreground text-center">{label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs text-purple font-heading font-600">2-of-3 required</p>

                {/* Comparison table */}
                <div className="rounded-lg overflow-hidden border border-border">
                  <div className="grid grid-cols-2 text-xs">
                    <div className="bg-secondary p-3 font-heading font-600 text-muted-foreground">Below ₦50M</div>
                    <div className="bg-purple-dim p-3 font-heading font-600 text-purple">₦50M and above</div>
                    <div className="p-3 border-t border-border text-muted-foreground">Single oracle key</div>
                    <div className="p-3 border-t border-border text-foreground">MPC threshold signing</div>
                    <div className="p-3 border-t border-border text-muted-foreground">Faster</div>
                    <div className="p-3 border-t border-border text-foreground">Cryptographic proof</div>
                    <div className="p-3 border-t border-border text-muted-foreground">Standard insurance</div>
                    <div className="p-3 border-t border-border text-foreground">Lower premium</div>
                    <div className="p-3 border-t border-border text-muted-foreground">No device needed</div>
                    <div className="p-3 border-t border-border text-foreground">Device share required</div>
                  </div>
                </div>

                <Button onClick={startCeremony} className="w-full flux-glow-btn font-heading font-600">
                  Start key ceremony <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flux-card p-8 space-y-6"
            >
              {!ceremonyDone ? (
                <div className="text-center space-y-6">
                  <Shield className="h-12 w-12 text-purple mx-auto animate-pulse" />
                  <h2 className="font-heading text-xl font-700 text-foreground">
                    Generating your key share...
                  </h2>
                  <div className="space-y-3">
                    {[
                      { label: 'Device share generated', done: progress >= 33 },
                      { label: 'Flux node ready', done: progress >= 66 },
                      { label: 'HSM node ready', done: progress >= 100 },
                    ].map(({ label, done }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                          done ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                        }`}>
                          {done && <Check className="h-3 w-3" />}
                        </div>
                        <span className={`text-sm ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className="h-full bg-purple"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="font-heading text-xl font-700 text-foreground">
                    Your Flux Private key is ready.
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Back up your key share to iCloud Keychain or Google Drive. 
                    You'll need it to exit independently.
                  </p>
                  <Button onClick={() => setStep(3)} className="w-full flux-glow-btn font-heading font-600">
                    Continue
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flux-card p-8 space-y-6 text-center"
            >
              <h2 className="font-heading text-xl font-700 text-foreground">Meet your Relationship Manager</h2>
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-2xl">
                  👤
                </div>
                <p className="font-heading font-600 text-foreground">Adekola Balogun</p>
                <p className="text-sm text-muted-foreground">Senior RM · Flux Private</p>
                <p className="text-xs text-muted-foreground">
                  Your RM monitors your loans and will contact you proactively if your LTV enters the caution zone.
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => navigate('/dashboard')} className="flex-1 flux-glow-btn font-heading font-600">
                  Go to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
