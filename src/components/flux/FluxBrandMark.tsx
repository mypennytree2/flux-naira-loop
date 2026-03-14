export default function FluxBrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { text: 'text-xl', pixel: 6, gap: 3, underline: 2 },
    md: { text: 'text-2xl', pixel: 8, gap: 4, underline: 3 },
    lg: { text: 'text-5xl', pixel: 10, gap: 5, underline: 4 },
  };
  const s = sizes[size];

  return (
    <div className="relative inline-flex items-start">
      <div className="relative">
        <span className={`font-heading font-800 text-foreground ${s.text} tracking-tight`}>
          FLUX
        </span>
        {/* Teal underline under the F */}
        <div
          className="absolute bg-primary"
          style={{
            bottom: -2,
            left: 0,
            width: '0.55em',
            height: s.underline,
            borderRadius: s.underline,
          }}
        />
      </div>
      {/* Pixel squares top-right */}
      <div className="flex gap-1 ml-1" style={{ marginTop: -2 }}>
        <div
          className="bg-primary rounded-[2px]"
          style={{ width: s.pixel, height: s.pixel }}
        />
        <div
          className="bg-primary/40 rounded-[2px]"
          style={{ width: s.pixel, height: s.pixel }}
        />
      </div>
    </div>
  );
}
