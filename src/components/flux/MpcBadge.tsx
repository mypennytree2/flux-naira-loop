import { Shield } from 'lucide-react';

export default function MpcBadge({ model }: { model: 'single_key' | 'mpc' }) {
  if (model === 'mpc') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-purple-dim px-2 py-0.5 text-[10px] font-heading font-600 text-purple">
        <Shield className="h-3 w-3" />
        FLUX PRIVATE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-heading font-600 text-muted-foreground">
      Single key
    </span>
  );
}
