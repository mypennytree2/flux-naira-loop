import { NavLink, useLocation } from 'react-router-dom';
import { Home, Landmark, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/borrow', icon: Landmark, label: 'Borrow' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
      <div className="flex items-center justify-around py-2">
        {items.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1 text-xs transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
