import { Link, useLocation } from 'react-router-dom';
import { Home, Landmark, Wallet, Shield, LogOut, Settings, ArrowLeftRight, CreditCard, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FluxBrandMark from '@/components/flux/FluxBrandMark';

export default function Sidebar() {
  const { isAdmin, profile, signOut } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/borrow', icon: Landmark, label: 'Borrow' },
    { to: '/loans', icon: CreditCard, label: 'Loans' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/exchange', icon: ArrowLeftRight, label: 'Exchange', locked: true },
    { to: '/settings', icon: Settings, label: 'Settings' },
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin', locked: false }] : []),
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-card">
      <div className="flex h-16 items-center px-6">
        <Link to="/dashboard">
          <FluxBrandMark size="md" />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {links.map(({ to, icon: Icon, label, locked }) => {
          const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {locked && <Lock className="h-3 w-3 ml-auto text-muted-foreground/50" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-heading font-600 text-foreground">
            {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || 'User'}</p>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[9px] px-1 py-0">Tier {profile?.kyc_tier || 0}</Badge>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
