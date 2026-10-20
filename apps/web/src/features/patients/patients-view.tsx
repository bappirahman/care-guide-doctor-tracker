'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PatientFormDialog } from './patient-form-dialog';
import { PatientsTable } from './patients-table';

export function PatientsView() {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patients"
        description="Every admission across all doctors, with their current condition."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            New patient
          </Button>
        }
      />
      <PatientsTable onAddPatient={() => setCreating(true)} />
      <PatientFormDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
