'use client';

import type { Doctor } from '@doctor-tracker/shared';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ApiError } from '@/lib/api-client';
import { pluralize } from '@/lib/format';
import { useDeleteDoctor } from './api';

type DeleteDoctorDialogProps = {
  doctor: Pick<Doctor, 'id' | 'name' | 'patientCount'> | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function DeleteDoctorDialog({ doctor, onOpenChange, onDeleted }: DeleteDoctorDialogProps) {
  const remove = useDeleteDoctor();

  // The API is the authority (counts can change), but a known non-zero count is
  // shown up front rather than letting the admin click into a refusal.
  const blockedCount =
    remove.error instanceof ApiError && remove.error.code === 'DOCTOR_HAS_PATIENTS'
      ? ((remove.error.details as { patientCount?: number } | undefined)?.patientCount ?? 0)
      : (doctor?.patientCount ?? 0);
  const blocked = blockedCount > 0;

  const close = (open: boolean) => {
    if (!open) remove.reset();
    onOpenChange(open);
  };

  return (
    <ConfirmDialog
      open={doctor !== null}
      onOpenChange={close}
      title={doctor ? `Delete ${doctor.name}?` : 'Delete doctor?'}
      description="This permanently removes the doctor. Patients are never deleted with them."
      confirmLabel="Delete doctor"
      pending={remove.isPending}
      error={
        blocked
          ? `${doctor?.name ?? 'This doctor'} still has ${pluralize(blockedCount, 'assigned patient')}. Unassign or reassign them first.`
          : (remove.error?.message ?? null)
      }
      onConfirm={() => {
        if (!doctor) return;
        remove.mutate(doctor.id, {
          onSuccess: () => {
            toast.success('Doctor deleted', { description: doctor.name });
            close(false);
            onDeleted?.();
          },
        });
      }}
    />
  );
}
