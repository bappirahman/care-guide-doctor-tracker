import { Suspense } from 'react';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { AppBreadcrumbs } from './app-breadcrumbs';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function AppHeader() {
  return (
    <header className="bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
      {/* Collapses the sidebar to icons on desktop and opens it as a sheet on mobile. */}
      <SidebarTrigger className="-ml-1.5" />
      <Separator
        orientation="vertical"
        className="mr-1 data-vertical:h-4 data-vertical:self-center"
      />
      <div className="min-w-0 flex-1">
        {/* Derived from the URL, so it streams in rather than blocking the static shell. */}
        <Suspense>
          <AppBreadcrumbs />
        </Suspense>
      </div>
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
