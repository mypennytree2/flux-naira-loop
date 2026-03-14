import { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';

interface NubanDisplayProps {
  accountNumber: string;
  accountName: string;
  bankName: string;
  large?: boolean;
}

export default function NubanDisplay({ accountNumber, accountName, bankName, large = false }: NubanDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className={`font-heading font-700 text-foreground tabular-nums ${large ? 'text-2xl' : 'text-lg'}`}>
          {accountNumber}
        </span>
        <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-sm text-muted-foreground">{accountName} · {bankName}</p>
    </div>
  );
}
