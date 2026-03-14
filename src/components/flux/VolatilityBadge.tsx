export default function VolatilityBadge({ vol24h, type }: { vol24h: number; type: string }) {
  if (type === 'stablecoin' || type === 'ngn_stablecoin') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Stable
      </span>
    );
  }
  
  const isHigh = vol24h > 5;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${isHigh ? 'text-warning' : 'text-primary'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isHigh ? 'bg-warning' : 'bg-primary'}`} />
      {isHigh ? `${vol24h.toFixed(1)}% vol` : 'Low vol'}
    </span>
  );
}
