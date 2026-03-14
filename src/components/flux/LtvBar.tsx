import { motion } from 'framer-motion';

interface LtvBarProps {
  currentLtv: number;
  marginCallLtv: number | null;
  liquidationLtv: number | null;
  maxLtv: number;
  showMarkers?: boolean;
}

export default function LtvBar({ currentLtv, marginCallLtv, liquidationLtv, maxLtv, showMarkers = true }: LtvBarProps) {
  const ltvPct = currentLtv * 100;
  const maxDisplay = Math.max(maxLtv * 100, 100);
  const barWidth = Math.min((ltvPct / maxDisplay) * 100, 100);

  const barColor = liquidationLtv && currentLtv >= liquidationLtv
    ? 'bg-destructive'
    : marginCallLtv && currentLtv >= marginCallLtv
    ? 'bg-warning'
    : ltvPct >= maxLtv * 85
    ? 'bg-warning'
    : 'bg-primary';

  return (
    <div className="space-y-1">
      <div className="relative h-3 w-full rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {/* Markers */}
        {showMarkers && marginCallLtv && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-warning/60"
            style={{ left: `${(marginCallLtv * 100 / maxDisplay) * 100}%` }}
          />
        )}
        {showMarkers && liquidationLtv && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-destructive/60"
            style={{ left: `${(liquidationLtv * 100 / maxDisplay) * 100}%` }}
          />
        )}
      </div>
      {showMarkers && (marginCallLtv || liquidationLtv) && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{(ltvPct).toFixed(1)}% LTV</span>
          <span>
            {marginCallLtv && `Margin ${(marginCallLtv * 100).toFixed(0)}%`}
            {marginCallLtv && liquidationLtv && ' · '}
            {liquidationLtv && `Liq ${(liquidationLtv * 100).toFixed(0)}%`}
          </span>
        </div>
      )}
    </div>
  );
}
