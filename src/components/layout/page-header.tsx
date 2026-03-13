'use client';
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { Button } from "../ui/button";
import { ArrowLeftRight } from "lucide-react";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    children?: React.ReactNode;
}

export function PageHeader({ title, description, children, className, ...props }: PageHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { isAdmin } = useUser();
    const isAdminPage = pathname.startsWith('/admin');

    return (
        <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-6 px-4 sm:px-6 md:px-8 border-b", className)} {...props}>
            <div className="flex items-center gap-4">
                <SidebarTrigger />
                 {isAdmin && isAdminPage && (
                    <Button variant="outline" onClick={() => router.push('/documents')} aria-label="Switch to student view" className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        <span className="hidden sm:inline">Student View</span>
                    </Button>
                )}
                <div className="grid gap-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">{title}</h1>
                    {description && <p className="text-muted-foreground">{description}</p>}
                </div>
            </div>
            {children && <div className="flex-shrink-0 w-full md:w-auto">{children}</div>}
        </div>
    );
}
