import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, User, Bell, Lock } from 'lucide-react';

export default function SettingsPage() {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl p-6 space-y-6">
        <h1 className="font-heading text-2xl font-800 text-foreground">Settings</h1>

        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flux-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-heading font-600 text-foreground">{profile?.full_name || 'User'}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <Badge variant="outline" className="text-xs">KYC Tier {profile?.kyc_tier || 0}</Badge>
              {isAdmin && <Badge className="text-xs bg-purple text-purple-foreground">Admin</Badge>}
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flux-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-heading font-600 text-foreground">Security</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Two-factor authentication</span>
              <Badge variant="outline" className="text-xs">Coming soon</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Flux Private (MPC)</span>
              <Badge variant="outline" className="text-xs">Not enrolled</Badge>
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flux-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-heading font-600 text-foreground">Notifications</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Margin call alerts, loan approvals, and transfer notifications are always enabled.
          </p>
        </motion.div>

        <Button onClick={signOut} variant="outline" className="w-full font-heading font-600 text-destructive border-destructive/30 hover:bg-destructive/10">
          Sign Out
        </Button>
      </div>
    </AppLayout>
  );
}
