'use client';

import { type Patient, type PatientCondition, PATIENT_CONDITIONS } from '@doctor-tracker/shared';
import { Pencil, Trash2, UserMinus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { type ActiveFilter, ActiveFilters } from '@/components/data-table/active-filters';
import { type Column, DataTable } from '@/components/data-table/data-table';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DateRangeFilter, describeRange } from '@/components/data-table/date-range-filter';
import { FacetFilter } from '@/components/data-table/facet-filter';
import { FilterSheet } from '@/components/data-table/filter-sheet';
import { SearchInput } from '@/components/data-table/search-input';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState, ErrorState } from '@/components/shared/list-states';
import { TruncatedText } from '@/components/shared/truncated-text';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DoctorCombobox } from '@/features/doctors/doctor-combobox';
import { formatDate } from '@/lib/format';
import { useDeletePatient, usePatients, useUpdatePatient } from './api';
import { CONDITION_META, ConditionBadge, ConditionDot } from './condition';
import { PatientFormDialog } from './patient-form-dialog';
import { type PatientListParams, usePatientListParams } from './search-params';

type ParamsUpdate = { [K in keyof PatientListParams]?: PatientListParams[K] | null };

const GENDER_SHORT = { male: 'Male', female: 'Female', other: 'Other' } as const;

const CONDITION_OPTIONS = PATIENT_CONDITIONS.map((condition) => ({
  value: condition,
  label: CONDITION_META[condition].label,
  adornment: <ConditionDot condition={condition} />,
}));

function columnsFor(showDoctor: boolean): Column<Patient>[] {
  return [
    {
      id: 'name',
      header: 'Patient',
      sort: { asc: 'name', desc: '-name', initial: 'asc' },
      className: 'max-w-64',
      cell: (patient) => (
        <div className="min-w-0">
          <TruncatedText className="font-medium">{patient.name}</TruncatedText>
          <span className="text-muted-foreground text-xs">
            {patient.age} · {GENDER_SHORT[patient.gender]}
          </span>
        </div>
      ),
    },
    {
      id: 'condition',
      header: 'Condition',
      cell: (patient) => <ConditionBadge condition={patient.condition} />,
    },
    ...(showDoctor
      ? [
          {
            id: 'doctor',
            header: 'Doctor',
            className: 'max-w-52',
            cell: (patient: Patient) =>
              patient.doctor ? (
                <Link
                  href={`/doctors/${patient.doctor.id}`}
                  className="block truncate hover:underline"
                >
                  {patient.doctor.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              ),
          },
        ]
      : []),
    {
      id: 'phone',
      header: 'Phone',
      cell: (patient) => <span className="text-muted-foreground">{patient.phone}</span>,
    },
    {
      id: 'admittedAt',
      header: 'Admitted',
      align: 'right',
      sort: { asc: 'admittedAt', desc: '-admittedAt', initial: 'desc' },
      cell: (patient) => (
        <span className="text-muted-foreground">{formatDate(patient.admittedAt)}</span>
      ),
    },
  ];
}

type PatientsTableProps = {
  // Fixes the list to one doctor (the doctor detail page): hides the doctor column and filter.
  doctorId?: string;
  onAddPatient: () => void;
};

export function PatientsTable({ doctorId, onAddPatient }: PatientsTableProps) {
  const [params, setParams] = usePatientListParams();
  const query = doctorId ? { ...params, doctor: doctorId } : params;
  const patients = usePatients(query);
  const remove = useDeletePatient();
  const update = useUpdatePatient();

  const [editing, setEditing] = useState<Patient | undefined>();
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const [unassigning, setUnassigning] = useState<Patient | null>(null);

  const setFilters = (next: ParamsUpdate) => void setParams({ ...next, page: null });

  const range = { from: params.from, to: params.to };
  const rangeLabel = describeRange(range);
  const activeFilters: ActiveFilter[] = [
    ...params.condition.map((condition) => ({
      key: `condition:${condition}`,
      label: 'Condition',
      value: CONDITION_META[condition].label,
      onRemove: () =>
        setFilters({ condition: params.condition.filter((item) => item !== condition) }),
    })),
    ...(rangeLabel
      ? [
          {
            key: 'admitted',
            label: 'Admitted',
            value: rangeLabel,
            onRemove: () => setFilters({ from: null, to: null }),
          },
        ]
      : []),
  ];
  // The doctor filter shows its own value on its button; it still counts as a filter.
  const doctorFiltered = !doctorId && params.doctor !== null;
  const isFiltered = activeFilters.length > 0 || doctorFiltered || params.search !== '';
  const clearAll = () =>
    setFilters({ search: null, condition: null, doctor: null, from: null, to: null });

  const filters = (
    <>
      <FacetFilter<PatientCondition>
        title="Condition"
        options={CONDITION_OPTIONS}
        selected={params.condition}
        onChange={(condition) => setFilters({ condition })}
      />
      {!doctorId && (
        <DoctorCombobox
          variant="filter"
          value={params.doctor}
          onChange={(doctor) => setFilters({ doctor })}
        />
      )}
      <DateRangeFilter label="Admitted" value={range} onChange={(value) => setFilters(value)} />
    </>
  );

  const confirmDelete = () => {
    if (!deleting) return;
    const { id, name } = deleting;
    // Optimistic: the row is already gone from the list; the dialog closes right away.
    setDeleting(null);
    remove.mutate(id, {
      onSuccess: () => toast.success('Patient deleted', { description: name }),
      onError: (error) =>
        toast.error('Could not delete the patient', { description: error.message }),
    });
  };

  const confirmUnassign = () => {
    if (!unassigning) return;
    update.mutate(
      { id: unassigning.id, input: { doctorId: null } },
      {
        onSuccess: () => {
          toast.success('Removed from doctor', {
            description: `${unassigning.name} is now unassigned.`,
          });
          setUnassigning(null);
        },
        onError: (error) =>
          toast.error('Could not update the patient', { description: error.message }),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={params.search}
            onChange={(search) => setFilters({ search: search || null })}
            placeholder="Search name or phone"
            className="w-full sm:w-72"
          />
          <div className="hidden flex-wrap items-center gap-2 md:flex">{filters}</div>
          <FilterSheet
            activeCount={activeFilters.length + (doctorFiltered ? 1 : 0)}
            onClearAll={clearAll}
          >
            {filters}
          </FilterSheet>
        </div>
        <ActiveFilters filters={activeFilters} onClearAll={clearAll} />
      </div>

      {patients.isError ? (
        <ErrorState
          title="Couldn't load patients"
          error={patients.error}
          onRetry={() => void patients.refetch()}
        />
      ) : (
        <>
          <DataTable
            label="Patients"
            columns={columnsFor(!doctorId)}
            rows={patients.data?.data}
            getRowId={(patient) => patient.id}
            isLoading={patients.isPending}
            isFetching={patients.isPlaceholderData}
            skeletonRows={Math.min(params.limit, 12)}
            sort={params.sort}
            onSortChange={(sort) => setFilters({ sort: sort as PatientListParams['sort'] })}
            onRowClick={setEditing}
            renderCard={(patient) => <PatientCard patient={patient} showDoctor={!doctorId} />}
            rowActions={(patient) => (
              <>
                <DropdownMenuItem onSelect={() => setEditing(patient)}>
                  <Pencil aria-hidden />
                  Edit
                </DropdownMenuItem>
                {patient.doctor && (
                  <DropdownMenuItem onSelect={() => setUnassigning(patient)}>
                    <UserMinus aria-hidden />
                    Remove from doctor
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(patient)}>
                  <Trash2 aria-hidden />
                  Delete
                </DropdownMenuItem>
              </>
            )}
            empty={
              isFiltered ? (
                <EmptyState
                  title="No patients match these filters"
                  description="Try a different search, or clear the filters."
                  action={
                    <Button variant="outline" size="sm" onClick={clearAll}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Users}
                  title={doctorId ? 'No patients assigned yet' : 'No patients yet'}
                  description={
                    doctorId
                      ? 'Add a patient here, or assign an existing one from the Patients page.'
                      : 'Record the first admission to get started.'
                  }
                  action={
                    <Button size="sm" onClick={onAddPatient}>
                      Add patient
                    </Button>
                  }
                />
              )
            }
          />
          {patients.data && patients.data.meta.total > 0 && (
            <DataTablePagination
              meta={patients.data.meta}
              onPageChange={(page) => void setParams({ page })}
              onLimitChange={(limit) => setFilters({ limit })}
            />
          )}
        </>
      )}

      <PatientFormDialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        {...(editing ? { patient: editing } : {})}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'patient'}?`}
        description="This permanently removes the patient's record. It can't be undone."
        confirmLabel="Delete patient"
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={unassigning !== null}
        onOpenChange={(open) => !open && setUnassigning(null)}
        title={`Remove ${unassigning?.name ?? 'patient'} from ${unassigning?.doctor?.name ?? 'this doctor'}?`}
        description="The patient record stays; they'll show as unassigned until someone reassigns them."
        confirmLabel="Remove from doctor"
        pending={update.isPending}
        onConfirm={confirmUnassign}
      />
    </div>
  );
}

function PatientCard({ patient, showDoctor }: { patient: Patient; showDoctor: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{patient.name}</span>
        <ConditionBadge condition={patient.condition} />
      </div>
      <p className="text-muted-foreground truncate text-sm">
        {patient.age} · {GENDER_SHORT[patient.gender]}
        {showDoctor && ` · ${patient.doctor?.name ?? 'Unassigned'}`}
      </p>
      <p className="text-muted-foreground text-xs">Admitted {formatDate(patient.admittedAt)}</p>
    </div>
  );
}
