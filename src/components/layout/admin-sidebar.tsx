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
import { Users, File, BarChart3, LogOut, ArrowLeftRight } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { appUser } = useUser();

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
      <SidebarHeader className='flex-row items-center justify-between'>
        <Logo brand="CICS" name="Vault" isDark />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/documents')}>
            <ArrowLeftRight className="h-4 w-4" />
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
           <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === '/admin/analytics'}
              onClick={() => router.push('/admin/analytics')}
              tooltip="Analytics"
            >
              <BarChart3 />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === '/admin/students'}
              onClick={() => router.push('/admin/students')}
              tooltip="Students"
            >
              <Users />
              <span>Students</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === '/admin/documents'}
              onClick={() => router.push('/admin/documents')}
              tooltip="Documents"
            >
              <File />
              <span>Documents</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="flex-col !items-start gap-4">
        <div className="flex items-center gap-3 px-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={appUser?.photoURL ?? undefined} alt={appUser?.displayName ?? 'Admin'} />
              <AvatarFallback>{getInitials(appUser?.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-sm overflow-hidden">
                <span className="font-semibold text-foreground truncate">{appUser?.displayName}</span>
                <span className="text-muted-foreground truncate">{appUser?.email}</span>
            </div>
        </div>
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
