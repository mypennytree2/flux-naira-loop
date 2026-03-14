import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function ExchangePage() {
  // For now, all corridors are inactive (Year 2 feature)
  return (
    <AppLayout>
      <div className="mx-auto max-w-lg p-6 flex items-center justify-center min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flux-card p-10 text-center space-y-6"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-800 text-foreground mb-2">Flux Exchange</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Coming in Year 2 — once we've built deep liquidity
              in each corridor from our lending operations.
            </p>
          </div>
          <Button asChild variant="outline" className="font-heading font-600">
            <Link to="/dashboard">
              Currently lending in 15 markets <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
