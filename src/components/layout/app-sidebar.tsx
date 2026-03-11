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
import { LibraryBig, User, LogOut } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { appUser } = useUser();

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
      <SidebarHeader className="pt-6">
        <div className="flex flex-col gap-1 pl-2">
            <Logo brand="CICS" name="DocHub" isDark showIcon={false} />
            <p className="text-sm font-medium text-sidebar-foreground/70">Student</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-4">
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
        <div className="flex items-center gap-3 px-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={appUser?.photoURL ?? undefined} alt={appUser?.displayName ?? 'User'} />
              <AvatarFallback>{getInitials(appUser?.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-xs overflow-hidden text-sidebar-foreground">
                <span className="font-semibold truncate">{appUser?.displayName}</span>
                <span className="opacity-80 truncate">{appUser?.email}</span>
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
