import { ShieldCheck } from "lucide-react";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-primary ${className}`}>
      <ShieldCheck className="h-8 w-8" />
      <div className="flex flex-col">
        <span className="font-headline text-lg font-bold leading-tight tracking-tighter">
          CICS
        </span>
        <span className="font-headline text-sm font-semibold leading-tight text-foreground/80">
          VaultConnect
        </span>
      </div>
    </div>
  );
}
