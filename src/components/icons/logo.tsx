import { LibraryBig } from "lucide-react";

export function Logo({
  className,
  name = "DocHub",
  brand = "CICS",
  role,
  isDark = false,
  showIcon = true,
}: {
  className?: string;
  name?: string;
  brand?: string;
  role?: string;
  isDark?: boolean;
  showIcon?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showIcon && <LibraryBig className="h-10 w-10 text-accent" />}
      <div>
        <div className="flex flex-row items-baseline gap-1.5">
          <span
            className={`font-headline text-2xl font-bold leading-none tracking-tighter text-accent`}
          >
            {brand}
          </span>
          <span
            className={`font-headline text-xl font-semibold leading-none text-accent/80`}
          >
            {name}
          </span>
        </div>
        {role && (
          <span
            className={`text-lg font-medium ${
              isDark ? "text-white" : "text-primary"
            }`}
          >
            {role}
          </span>
        )}
      </div>
    </div>
  );
}
