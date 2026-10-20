import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DoctorDetailView } from '@/features/doctors/doctor-detail-view';

export const metadata: Metadata = { title: 'Doctor' };

export default function DoctorPage() {
  return (
    <Suspense>
      <DoctorDetailView />
    </Suspense>
  );
}
