'use client';
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    children?: React.ReactNode;
}

export function PageHeader({ title, description, children, className, ...props }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-6 px-4 sm:px-6 md:px-8 border-b", className)} {...props}>
            <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="grid gap-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">{title}</h1>
                    {description && <p className="text-muted-foreground">{description}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {children && <div className="flex-shrink-0 w-full md:w-auto">{children}</div>}
                <ThemeToggle />
            </div>
        </div>
    );
}
