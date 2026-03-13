import { Link, useLocation } from 'react-router-dom';
import { Home, Landmark, Wallet, Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Sidebar() {
  const { isAdmin, signOut } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/borrow', icon: Landmark, label: 'Borrow' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-card">
      <div className="flex h-16 items-center px-6">
        <Link to="/dashboard" className="font-heading text-2xl font-800 text-primary">
          FLUX
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {links.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to);
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
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
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
