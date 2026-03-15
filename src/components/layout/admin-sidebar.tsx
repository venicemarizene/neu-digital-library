
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
import { Users, File, BarChart3, LogOut, LibraryBig } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { appUser, loading } = useUser();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-5">
        <div className="flex items-center gap-3">
          <LibraryBig className="h-11 w-11 flex-shrink-0 text-accent" />
          <div className="flex flex-col">
            <div className="flex flex-row items-end gap-1.5">
              <span className="font-headline text-2xl font-bold leading-none tracking-tighter text-accent">
                CICS
              </span>
              <span className="font-headline text-xl font-semibold leading-none text-accent">
                DocHub
              </span>
            </div>
            <span className="text-lg font-medium text-accent">Admin</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
           <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === '/admin/analytics'}
              onClick={() => router.push('/admin/analytics')}
              tooltip="Dashboard"
            >
              <BarChart3 />
              <span className='ml-2'>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === '/admin/students'}
              onClick={() => router.push('/admin/students')}
              tooltip="Students"
            >
              <Users />
              <span className='ml-2'>Students</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === '/admin/documents'}
              onClick={() => router.push('/admin/documents')}
              tooltip="Documents"
            >
              <File />
              <span className='ml-2'>Documents</span>
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
          <div className="flex w-full items-center gap-3 px-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={appUser?.photoURL ?? undefined} alt={appUser?.displayName ?? 'Admin'} />
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
