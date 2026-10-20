'use client';

import type { Doctor, Specialization } from '@doctor-tracker/shared';
import { Eye, Pencil, Plus, Stethoscope, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type ActiveFilter, ActiveFilters } from '@/components/data-table/active-filters';
import { type Column, DataTable } from '@/components/data-table/data-table';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DateRangeFilter, describeRange } from '@/components/data-table/date-range-filter';
import { FacetFilter } from '@/components/data-table/facet-filter';
import { FilterSheet } from '@/components/data-table/filter-sheet';
import { SearchInput } from '@/components/data-table/search-input';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState, ErrorState } from '@/components/shared/list-states';
import { TruncatedText } from '@/components/shared/truncated-text';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { useDoctorFilters, useDoctors } from './api';
import { DeleteDoctorDialog } from './delete-doctor-dialog';
import { DoctorFormDialog } from './doctor-form-dialog';
import { type DoctorListParams, useDoctorListParams } from './search-params';

// `null` removes a key from the URL, which is how filters are cleared.
type ParamsUpdate = {
  [K in keyof DoctorListParams]?: DoctorListParams[K] | null;
};

const COLUMNS: Column<Doctor>[] = [
  {
    id: 'name',
    header: 'Doctor',
    sort: { asc: 'name', desc: '-name', initial: 'asc' },
    className: 'max-w-64',
    cell: (doctor) => (
      <div className="min-w-0">
        <Link href={`/doctors/${doctor.id}`} className="font-medium hover:underline">
          {doctor.name}
        </Link>
        <TruncatedText className="text-muted-foreground text-xs">{doctor.email}</TruncatedText>
      </div>
    ),
  },
  { id: 'specialization', header: 'Specialization', cell: (doctor) => doctor.specialization },
  {
    id: 'hospital',
    header: 'Hospital',
    className: 'max-w-56',
    cell: (doctor) => <TruncatedText>{doctor.hospital}</TruncatedText>,
  },
  {
    id: 'phone',
    header: 'Phone',
    cell: (doctor) => <span className="text-muted-foreground">{doctor.phone}</span>,
  },
  {
    id: 'patients',
    header: 'Patients',
    align: 'right',
    cell: (doctor) => formatNumber(doctor.patientCount),
  },
  {
    id: 'createdAt',
    header: 'Added',
    align: 'right',
    sort: { asc: 'createdAt', desc: '-createdAt', initial: 'desc' },
    cell: (doctor) => <span className="text-muted-foreground">{formatDate(doctor.createdAt)}</span>,
  },
];

export function DoctorsView() {
  const router = useRouter();
  const [params, setParams] = useDoctorListParams();
  const doctors = useDoctors(params);
  const { data: filterOptions } = useDoctorFilters();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | undefined>();
  const [deleting, setDeleting] = useState<Doctor | null>(null);

  // Any filter change goes back to page 1; staying on page 7 of a narrower result is a dead end.
  const setFilters = (update: ParamsUpdate) => void setParams({ ...update, page: null });

  const range = { from: params.from, to: params.to };
  const rangeLabel = describeRange(range);
  const activeFilters: ActiveFilter[] = [
    ...params.specialization.map((value) => ({
      key: `specialization:${value}`,
      label: 'Specialization',
      value,
      onRemove: () =>
        setFilters({ specialization: params.specialization.filter((item) => item !== value) }),
    })),
    ...params.hospital.map((value) => ({
      key: `hospital:${value}`,
      label: 'Hospital',
      value,
      onRemove: () => setFilters({ hospital: params.hospital.filter((item) => item !== value) }),
    })),
    ...(rangeLabel
      ? [
          {
            key: 'added',
            label: 'Added',
            value: rangeLabel,
            onRemove: () => setFilters({ from: null, to: null }),
          },
        ]
      : []),
  ];
  const isFiltered = activeFilters.length > 0 || params.search !== '';
  const clearAll = () =>
    setFilters({ search: null, specialization: null, hospital: null, from: null, to: null });

  const filters = (
    <>
      <FacetFilter<Specialization>
        title="Specialization"
        options={(filterOptions?.specializations ?? []).map((value) => ({ value, label: value }))}
        selected={params.specialization}
        onChange={(specialization) => setFilters({ specialization })}
      />
      <FacetFilter
        title="Hospital"
        options={(filterOptions?.hospitals ?? []).map((value) => ({ value, label: value }))}
        selected={params.hospital}
        onChange={(hospital) => setFilters({ hospital })}
      />
      <DateRangeFilter label="Added" value={range} onChange={(value) => setFilters(value)} />
    </>
  );

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Doctors"
        description="Everyone on staff, their specialty, hospital and current patient load."
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            New doctor
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={params.search}
            onChange={(search) => setFilters({ search: search || null })}
            placeholder="Search name, email or phone"
            className="w-full sm:w-72"
          />
          <div className="hidden flex-wrap items-center gap-2 md:flex">{filters}</div>
          <FilterSheet activeCount={activeFilters.length} onClearAll={clearAll}>
            {filters}
          </FilterSheet>
        </div>
        <ActiveFilters filters={activeFilters} onClearAll={clearAll} />
      </div>

      {doctors.isError ? (
        <ErrorState
          title="Couldn't load doctors"
          error={doctors.error}
          onRetry={() => void doctors.refetch()}
        />
      ) : (
        <>
          <DataTable
            label="Doctors"
            columns={COLUMNS}
            rows={doctors.data?.data}
            getRowId={(doctor) => doctor.id}
            isLoading={doctors.isPending}
            isFetching={doctors.isPlaceholderData}
            skeletonRows={params.limit > 20 ? 12 : params.limit}
            sort={params.sort}
            onSortChange={(sort) => setFilters({ sort: sort as DoctorListParams['sort'] })}
            onRowClick={(doctor) => router.push(`/doctors/${doctor.id}`)}
            renderCard={(doctor) => <DoctorCard doctor={doctor} />}
            rowActions={(doctor) => (
              <>
                <DropdownMenuItem asChild>
                  <Link href={`/doctors/${doctor.id}`}>
                    <Eye aria-hidden />
                    View
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setEditing(doctor);
                    setFormOpen(true);
                  }}
                >
                  <Pencil aria-hidden />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(doctor)}>
                  <Trash2 aria-hidden />
                  Delete
                </DropdownMenuItem>
              </>
            )}
            empty={
              isFiltered ? (
                <EmptyState
                  title="No doctors match these filters"
                  description="Try a different search, or clear the filters to see everyone."
                  action={
                    <Button variant="outline" size="sm" onClick={clearAll}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Stethoscope}
                  title="No doctors yet"
                  description="Add the first doctor, then assign patients to them."
                  action={
                    <Button size="sm" onClick={openCreate}>
                      <Plus aria-hidden />
                      New doctor
                    </Button>
                  }
                />
              )
            }
          />
          {doctors.data && doctors.data.meta.total > 0 && (
            <DataTablePagination
              meta={doctors.data.meta}
              onPageChange={(page) => void setParams({ page })}
              onLimitChange={(limit) => setFilters({ limit })}
            />
          )}
        </>
      )}

      <DoctorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        {...(editing ? { doctor: editing } : {})}
      />
      <DeleteDoctorDialog doctor={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
    </div>
  );
}

function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Link href={`/doctors/${doctor.id}`} className="truncate font-medium">
        {doctor.name}
      </Link>
      <p className="text-muted-foreground truncate text-sm">
        {doctor.specialization} · {doctor.hospital}
      </p>
      <p className="text-muted-foreground text-xs">
        {pluralize(doctor.patientCount, 'patient')} · Added {formatDate(doctor.createdAt)}
      </p>
    </div>
  );
}
