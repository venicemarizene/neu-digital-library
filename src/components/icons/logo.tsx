import { LibraryBig } from "lucide-react";

export function Logo({
  className,
  name = "DocHub",
  brand = "CICS",
  isDark = false,
  showIcon = true,
}: {
  className?: string;
  name?: string;
  brand?: string;
  isDark?: boolean;
  showIcon?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${isDark ? 'text-sidebar-foreground' : 'text-primary'} ${className}`}>
      {showIcon && <LibraryBig className="h-8 w-8 text-accent ml-3" />}
      <div className="flex flex-row items-baseline gap-1.5">
        <span className={`font-headline text-xl font-bold leading-none tracking-tighter text-accent`}>
          {brand}
        </span>
        <span className={`font-headline text-lg font-semibold leading-none text-accent/80`}>
          {name}
        </span>
      </div>
    </div>
  );
}
