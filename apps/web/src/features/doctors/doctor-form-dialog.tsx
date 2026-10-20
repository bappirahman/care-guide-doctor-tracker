'use client';

import {
  type Doctor,
  type DoctorInput,
  doctorInputSchema,
  SPECIALIZATIONS,
} from '@doctor-tracker/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Control, Controller, type FieldPath, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { applyServerErrors } from '@/lib/form-errors';
import { useCreateDoctor, useDoctorFilters, useUpdateDoctor } from './api';

const FIELDS = ['name', 'specialization', 'hospital', 'phone', 'email'] as const;

type DoctorFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Present when editing.
  doctor?: Doctor;
};

export function DoctorFormDialog({ open, onOpenChange, doctor }: DoctorFormDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={doctor ? 'Edit doctor' : 'New doctor'}
      description={
        doctor
          ? `Update ${doctor.name}'s details.`
          : 'Add a doctor so patients can be assigned to them.'
      }
    >
      {/* Remounting per doctor resets the form to that doctor's values. */}
      <DoctorForm key={doctor?.id ?? 'new'} doctor={doctor} onDone={() => onOpenChange(false)} />
    </ResponsiveDialog>
  );
}

function DoctorForm({ doctor, onDone }: { doctor: Doctor | undefined; onDone: () => void }) {
  const create = useCreateDoctor();
  const update = useUpdateDoctor(doctor?.id ?? '');
  const mutation = doctor ? update : create;
  const { data: filters } = useDoctorFilters();

  const form = useForm<DoctorInput>({
    resolver: zodResolver(doctorInputSchema),
    defaultValues: {
      name: doctor?.name ?? '',
      hospital: doctor?.hospital ?? '',
      phone: doctor?.phone ?? '',
      email: doctor?.email ?? '',
      ...(doctor ? { specialization: doctor.specialization } : {}),
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: ({ data }) => {
        toast.success(doctor ? 'Doctor updated' : 'Doctor added', { description: data.name });
        onDone();
      },
      onError: (error) => {
        if (!applyServerErrors(error, form.setError, FIELDS)) {
          toast.error('Could not save the doctor', { description: error.message });
        }
      },
    });
  });

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate>
      <FieldGroup>
        <TextField control={form.control} name="name" label="Full name" autoComplete="name" />

        <Controller
          name="specialization"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="doctor-specialization">Specialization</FieldLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger
                  id="doctor-specialization"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                  onBlur={field.onBlur}
                >
                  <SelectValue placeholder="Choose a specialization" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALIZATIONS.map((specialization) => (
                    <SelectItem key={specialization} value={specialization}>
                      {specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Free text with suggestions from hospitals already in use, so spellings stay consistent. */}
        <TextField
          control={form.control}
          name="hospital"
          label="Hospital"
          list="hospital-options"
        />
        <datalist id="hospital-options">
          {filters?.hospitals.map((hospital) => (
            <option key={hospital} value={hospital} />
          ))}
        </datalist>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="phone"
            label="Phone"
            type="tel"
            autoComplete="tel"
          />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {doctor ? 'Save changes' : 'Add doctor'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

type TextFieldProps = {
  control: Control<DoctorInput>;
  name: Exclude<FieldPath<DoctorInput>, 'specialization'>;
  label: string;
  type?: string;
  autoComplete?: string;
  list?: string;
};

function TextField({ control, name, label, type = 'text', autoComplete, list }: TextFieldProps) {
  const id = `doctor-${name}`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            id={id}
            type={type}
            aria-invalid={fieldState.invalid}
            {...(autoComplete ? { autoComplete } : {})}
            {...(list ? { list } : {})}
          />
          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
