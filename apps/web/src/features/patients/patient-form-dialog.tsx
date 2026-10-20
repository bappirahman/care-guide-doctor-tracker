'use client';

import {
  GENDERS,
  PATIENT_CONDITIONS,
  type Patient,
  patientInputSchema,
} from '@doctor-tracker/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { DoctorCombobox } from '@/features/doctors/doctor-combobox';
import { applyServerErrors } from '@/lib/form-errors';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useCreatePatient, useUpdatePatient } from './api';
import { CONDITION_META, ConditionDot } from './condition';

type FormInput = z.input<typeof patientInputSchema>;
type FormOutput = z.output<typeof patientInputSchema>;

const FIELDS = [
  'name',
  'age',
  'gender',
  'phone',
  'condition',
  'admittedAt',
  'doctorId',
  'notes',
] as const;

const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' } as const;

type PatientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Present when editing.
  patient?: Patient;
  // Preselected doctor when adding from a doctor's page.
  doctorId?: string;
};

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  doctorId,
}: PatientFormDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={patient ? 'Edit patient' : 'New patient'}
      description={patient ? `Update ${patient.name}'s record.` : 'Record a new admission.'}
    >
      <PatientForm
        key={patient?.id ?? `new-${doctorId ?? ''}`}
        patient={patient}
        doctorId={doctorId}
        onDone={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  );
}

function PatientForm({
  patient,
  doctorId,
  onDone,
}: {
  patient: Patient | undefined;
  doctorId: string | undefined;
  onDone: () => void;
}) {
  const create = useCreatePatient();
  const update = useUpdatePatient();
  const isPending = create.isPending || update.isPending;

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(patientInputSchema),
    defaultValues: patient
      ? {
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          phone: patient.phone,
          condition: patient.condition,
          admittedAt: new Date(patient.admittedAt),
          doctorId: patient.doctor?.id ?? null,
          notes: patient.notes,
        }
      : { name: '', phone: '', notes: '', admittedAt: new Date(), doctorId: doctorId ?? null },
  });

  const onError = (error: Error) => {
    if (!applyServerErrors(error, form.setError, FIELDS)) {
      toast.error('Could not save the patient', { description: error.message });
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    const onSuccess = () => {
      toast.success(patient ? 'Patient updated' : 'Patient added', { description: values.name });
      onDone();
    };
    if (patient) update.mutate({ id: patient.id, input: values }, { onSuccess, onError });
    else create.mutate(values, { onSuccess, onError });
  });

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate>
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="patient-name">Full name</FieldLabel>
              <Input
                {...field}
                id="patient-name"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            name="age"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="patient-age">Age</FieldLabel>
                <Input
                  id="patient-age"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={120}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={
                    typeof field.value === 'number' || typeof field.value === 'string'
                      ? field.value
                      : ''
                  }
                  // Number('') is 0, a valid age; an emptied box must stay "missing".
                  onChange={(event) =>
                    field.onChange(event.target.value === '' ? undefined : event.target.value)
                  }
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="gender"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="patient-gender">Gender</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="patient-gender"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((gender) => (
                      <SelectItem key={gender} value={gender}>
                        {GENDER_LABELS[gender]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            name="phone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="patient-phone">Phone</FieldLabel>
                <Input {...field} id="patient-phone" type="tel" aria-invalid={fieldState.invalid} />
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="condition"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="patient-condition">Condition</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="patient-condition"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {PATIENT_CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        <ConditionDot condition={condition} />
                        {CONDITION_META[condition].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            name="admittedAt"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="patient-admitted">Admitted on</FieldLabel>
                <DatePicker
                  id="patient-admitted"
                  value={field.value instanceof Date ? field.value : undefined}
                  onChange={field.onChange}
                  invalid={fieldState.invalid}
                />
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="doctorId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="patient-doctor">Doctor</FieldLabel>
                <DoctorCombobox
                  id="patient-doctor"
                  variant="field"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  invalid={fieldState.invalid}
                />
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="notes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="patient-notes">Clinical notes</FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ''}
                id="patient-notes"
                rows={3}
                placeholder="Optional"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner />}
            {patient ? 'Save changes' : 'Add patient'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function DatePicker({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  invalid: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-invalid={invalid}
          className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground')}
        >
          <CalendarDays aria-hidden />
          {value ? formatDate(value) : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value ?? new Date()}
          captionLayout="dropdown"
          disabled={{ after: new Date() }}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
