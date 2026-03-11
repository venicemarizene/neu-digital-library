import { ShieldCheck } from "lucide-react";

export function Logo({
  className,
  name = "VaultConnect",
  brand = "CICS",
  isDark = false,
}: {
  className?: string;
  name?: string;
  brand?: string;
  isDark?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${isDark ? 'text-sidebar-foreground' : 'text-primary'} ${className}`}>
      <ShieldCheck className="h-8 w-8 text-primary" />
      <div className="flex flex-col">
        <span className={`font-headline text-lg font-bold leading-tight tracking-tighter ${isDark ? '' : 'text-foreground'}`}>
          {brand}
        </span>
        <span className={`font-headline text-sm font-semibold leading-tight ${isDark ? 'text-sidebar-foreground/80' : 'text-foreground/80'}`}>
          {name}
        </span>
      </div>
    </div>
  );
}
