import { AppSidebar } from '@/components/layout/app-sidebar';
import { Brand } from '@/components/layout/brand';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default function PortalLayout({ children }: LayoutProps<'/'>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* On mobile the sidebar is a sheet, so the trigger needs a home. */}
        <header className="bg-background/95 sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-4 backdrop-blur md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Brand />
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
