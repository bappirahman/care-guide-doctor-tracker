'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoctor } from '@/features/doctors/api';

const SECTIONS: Record<string, string> = {
  dashboard: 'Dashboard',
  doctors: 'Doctors',
  patients: 'Patients',
};

type Crumb = { href: string; label: React.ReactNode };

export function AppBreadcrumbs() {
  const [section = '', id] = usePathname().split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ href: `/${section}`, label: SECTIONS[section] ?? section }];
  if (section === 'doctors' && id) {
    crumbs.push({ href: `/doctors/${id}`, label: <DoctorName id={id} /> });
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// Shares the page's query, so the name costs no extra request.
function DoctorName({ id }: { id: string }) {
  const { data } = useDoctor(id);
  return data ? data.name : <Skeleton className="h-4 w-28" />;
}
