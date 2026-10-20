'use client';

import { LayoutDashboard, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { Brand } from './brand';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/patients', label: 'Patients', icon: Users },
] as const;

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b px-3 group-data-[collapsible=icon]:px-2">
        <Brand className="group-data-[collapsible=icon]:[&>span:last-child]:hidden" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {/* The current path is request data; the links render in the static shell and
                the active highlight streams in, instead of blocking prerendering. */}
            <Suspense fallback={<NavMenu activePath={null} />}>
              <ActiveNavMenu />
            </Suspense>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function ActiveNavMenu() {
  return <NavMenu activePath={usePathname()} />;
}

function NavMenu({ activePath }: { activePath: string | null }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton
            asChild
            isActive={activePath === href || Boolean(activePath?.startsWith(`${href}/`))}
            tooltip={label}
            className="data-[active=true]:text-sidebar-primary"
          >
            {/* The mobile sheet stays open across client navigations unless closed here. */}
            <Link href={href} onClick={() => isMobile && setOpenMobile(false)}>
              <Icon aria-hidden />
              <span>{label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
