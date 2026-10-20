import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardView } from '@/features/dashboard/dashboard-view';

export const metadata: Metadata = { title: 'Dashboard' };

// The date range lives in the URL, which only exists at request time.
export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
