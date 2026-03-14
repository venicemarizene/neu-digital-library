'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { LibraryBig, User, LogOut, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { appUser, loading } = useUser();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  return (
    <Sidebar>
      <SidebarHeader className="pt-4 mb-4 px-4">
        <div>
          <Logo brand="CICS" name="DocHub" isDark />
          <p className="text-base font-medium text-sidebar-foreground/70 ml-11 tracking-wider">
            Student
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
           <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith('/dashboard')}
              onClick={() => router.push('/dashboard')}
              tooltip="Dashboard"
            >
              <LayoutDashboard />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith('/documents')}
              onClick={() => router.push('/documents')}
              tooltip="Library"
            >
              <LibraryBig />
              <span>Library</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === '/profile'}
              onClick={() => router.push('/profile')}
              tooltip="My Profile"
            >
              <User />
              <span>My Profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="flex-col !items-start gap-4">
        {loading ? (
           <div className="flex w-full items-center gap-3 px-2">
             <Skeleton className="h-9 w-9 rounded-full" />
             <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
             </div>
           </div>
        ) : (
        <div className="flex w-full items-center gap-3 px-2 overflow-hidden">
            <Avatar className="h-9 w-9">
              <AvatarImage src={appUser?.photoURL ?? undefined} alt={appUser?.displayName ?? 'User'} />
              <AvatarFallback>{getInitials(appUser?.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-sidebar-foreground break-words leading-tight">{appUser?.displayName}</span>
                <span className="text-xs text-sidebar-foreground/80 break-all">{appUser?.email}</span>
            </div>
        </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out">
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
