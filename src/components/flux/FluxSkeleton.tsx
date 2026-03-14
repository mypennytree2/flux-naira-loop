import { cn } from '@/lib/utils';

export default function FluxSkeleton({ className }: { className?: string }) {
  return <div className={cn('flux-skeleton', className)} />;
}
