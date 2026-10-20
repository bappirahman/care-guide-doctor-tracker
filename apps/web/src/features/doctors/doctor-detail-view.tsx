'use client';

import { type DoctorDetail, PATIENT_CONDITIONS } from '@doctor-tracker/shared';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Mail,
  Pencil,
  Phone,
  Trash2,
  UserX,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState, ErrorState } from '@/components/shared/list-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CONDITION_META, ConditionDot } from '@/features/patients/condition';
import { ApiError } from '@/lib/api-client';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { useDoctor } from './api';
import { DeleteDoctorDialog } from './delete-doctor-dialog';
import { DoctorFormDialog } from './doctor-form-dialog';

export function DoctorDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const doctor = useDoctor(id);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (doctor.isPending) return <DoctorDetailSkeleton />;

  if (doctor.isError) {
    const missing = doctor.error instanceof ApiError && [400, 404].includes(doctor.error.status);
    return missing ? (
      <EmptyState
        icon={UserX}
        title="Doctor not found"
        description="They may have been deleted, or the link is wrong."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/doctors">
              <ArrowLeft aria-hidden />
              All doctors
            </Link>
          </Button>
        }
      />
    ) : (
      <ErrorState
        title="Couldn't load this doctor"
        error={doctor.error}
        onRetry={() => void doctor.refetch()}
      />
    );
  }

  const data = doctor.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={data.name}
        description={`${data.specialization} · ${data.hospital}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleting(true)}>
              <Trash2 aria-hidden />
              Delete
            </Button>
            <Button onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              Edit
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-4 text-sm">
              <DetailRow icon={Phone} label="Phone">
                <a href={`tel:${data.phone.replace(/[^\d+]/g, '')}`} className="hover:underline">
                  {data.phone}
                </a>
              </DetailRow>
              <DetailRow icon={Mail} label="Email">
                <a href={`mailto:${data.email}`} className="break-all hover:underline">
                  {data.email}
                </a>
              </DetailRow>
              <DetailRow icon={Building2} label="Hospital">
                {data.hospital}
              </DetailRow>
              <DetailRow icon={CalendarDays} label="Added">
                {formatDate(data.createdAt)}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Patients by condition</CardTitle>
            <CardDescription>{pluralize(data.patientCount, 'assigned patient')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ConditionBreakdown doctor={data} />
          </CardContent>
        </Card>
      </div>

      <DoctorFormDialog open={editing} onOpenChange={setEditing} doctor={data} />
      <DeleteDoctorDialog
        doctor={deleting ? data : null}
        onOpenChange={setDeleting}
        onDeleted={() => router.push('/doctors')}
      />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="mt-0.5">{children}</dd>
      </div>
    </div>
  );
}

function ConditionBreakdown({ doctor }: { doctor: DoctorDetail }) {
  if (doctor.patientCount === 0) {
    return <p className="text-muted-foreground text-sm">No patients are assigned yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {PATIENT_CONDITIONS.map((condition) => {
        const count = doctor.conditionCounts[condition];
        const share = count / doctor.patientCount;
        return (
          <li
            key={condition}
            className="grid grid-cols-[10rem_1fr_4rem] items-center gap-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <ConditionDot condition={condition} />
              {CONDITION_META[condition].label}
            </span>
            <span className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
              <span
                className="block h-full rounded-full bg-(--tone)"
                style={
                  {
                    '--tone': CONDITION_META[condition].tone,
                    width: `${share * 100}%`,
                  } as CSSProperties
                }
              />
            </span>
            <span className="text-right">
              <span className="font-medium">{formatNumber(count)}</span>
              <span className="text-muted-foreground ml-1.5 text-xs">
                {Math.round(share * 100)}%
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function DoctorDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
