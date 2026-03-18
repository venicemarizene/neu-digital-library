import Image from "next/image";

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
      {showIcon && (
        <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full overflow-hidden ${isDark ? "bg-white" : ""}`}>
        <Image
        src="/NEU_LOGO.png"
        alt="New Era University"
        width={50}
        height={50}
        className="object-cover w-full h-full"
      />
  </div>
)}
      <div>
        <div className="flex flex-row items-baseline gap-1.5">
          <span
            className={`font-headline text-2xl font-bold leading-none tracking-tighter text-accent`}
          >
            {brand}
          </span>
          <span
            className={`font-headline text-xl font-semibold leading-none text-accent`}
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
